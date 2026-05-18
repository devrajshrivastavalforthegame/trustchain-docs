"use strict";

const jwt = require("jsonwebtoken");

function isRbacEnabled() {
  return String(process.env.ENABLE_RBAC || "false").toLowerCase() === "true";
}

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function normalizePermissions(value) {
  if (!value) return [];
  if (Array.isArray(value)) return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
  if (typeof value === "string") return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
  return [];
}

function extractBearerToken(req) {
  const header = String(req.headers.authorization || req.headers.Authorization || "").trim();
  const parts = header.split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;
  return parts[1];
}

function getJwtSecret() {
  return process.env.JWT_ACCESS_SECRET || process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || "";
}

function safeRequireDbPool() {
  const candidates = ["../config/db", "../db", "../db/pool", "../config/database"];
  for (const candidate of candidates) {
    try {
      const loaded = require(candidate);
      if (loaded && typeof loaded.query === "function") return loaded;
      if (loaded && loaded.pool && typeof loaded.pool.query === "function") return loaded.pool;
      if (loaded && loaded.default && typeof loaded.default.query === "function") return loaded.default;
    } catch (_) {
      // Optional DB lookup. Ignore missing modules/tables.
    }
  }
  return null;
}

function accountIsActive(status) {
  const normalized = String(status || "approved").trim().toLowerCase();
  return ["approved", "active", "enabled"].includes(normalized);
}

async function fetchUser(pool, decoded) {
  if (!pool) return null;

  const userId = decoded.id || decoded.userId || decoded.user_id || decoded.sub || null;
  const email = decoded.email || null;

  if (!userId && !email) return null;

  try {
    const result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE ($1::text IS NOT NULL AND id::text = $1::text)
         OR ($2::text IS NOT NULL AND LOWER(email) = LOWER($2::text))
      LIMIT 1
      `,
      [userId ? String(userId) : null, email ? String(email) : null]
    );
    return result.rows[0] || null;
  } catch (_) {
    return null;
  }
}

async function fetchPermissions(pool, user) {
  const permissions = new Set(normalizePermissions(user && user.permissions));
  if (!pool || !user) return [...permissions];

  const role = normalizeRole(user.role);
  const userId = user.id || user.userId || user.user_id || null;

  const queries = [
    {
      sql: `
        SELECT p.name AS permission
        FROM permissions p
        JOIN role_permissions rp ON rp.permission_id = p.id
        JOIN roles r ON r.id = rp.role_id
        WHERE LOWER(r.name) = LOWER($1)
      `,
      params: [role]
    },
    {
      sql: `
        SELECT p.name AS permission
        FROM permissions p
        JOIN user_roles ur ON ur.user_id::text = $1::text
        JOIN role_permissions rp ON rp.role_id = ur.role_id
        WHERE p.id = rp.permission_id
      `,
      params: [userId ? String(userId) : null]
    },
    {
      sql: `SELECT permission FROM user_permissions WHERE user_id::text = $1::text`,
      params: [userId ? String(userId) : null]
    }
  ];

  for (const query of queries) {
    try {
      if (query.params.some((value) => !value)) continue;
      const result = await pool.query(query.sql, query.params);
      for (const row of result.rows) {
        if (row.permission) permissions.add(String(row.permission).trim());
      }
    } catch (_) {
      // Missing RBAC tables should not break demo when fallback roles are enough.
    }
  }

  return [...permissions].filter(Boolean);
}

async function requireAuth(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const secret = getJwtSecret();
    if (!secret) {
      return res.status(500).json({ success: false, message: "JWT secret is not configured" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (error) {
      return res.status(401).json({
        success: false,
        code: error && error.name === "TokenExpiredError" ? "ACCESS_TOKEN_EXPIRED" : "ACCESS_TOKEN_INVALID",
        message: error && error.name === "TokenExpiredError" ? "Access token expired" : "Invalid access token"
      });
    }

    const pool = safeRequireDbPool();
    const dbUser = await fetchUser(pool, decoded);
    const mergedUser = {
      ...decoded,
      ...(dbUser || {}),
      id: (dbUser && dbUser.id) || decoded.id || decoded.userId || decoded.sub,
      email: (dbUser && dbUser.email) || decoded.email,
      role: normalizeRole((dbUser && dbUser.role) || decoded.role),
      status: (dbUser && dbUser.status) || decoded.status || "approved"
    };

    mergedUser.permissions = await fetchPermissions(pool, mergedUser);

    req.user = mergedUser;
    req.auth = { authenticated: true, rbacEnabled: isRbacEnabled(), permissions: mergedUser.permissions };

    return next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Authentication check failed safely" });
  }
}

function requireActiveAccount(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication context missing" });
  }

  if (!accountIsActive(req.user.status)) {
    return res.status(403).json({ success: false, message: "Account is not approved for access" });
  }

  return next();
}

function requireRole(...roles) {
  const allowedRoles = roles.flat().map(normalizeRole).filter(Boolean);

  return function roleGuard(req, res, next) {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication context missing" });

    const userRole = normalizeRole(req.user.role);
    if (["admin", "developer"].includes(userRole)) return next();
    if (allowedRoles.includes(userRole)) return next();

    return res.status(403).json({
      success: false,
      message: "Access denied: role not allowed",
      requiredRoles: allowedRoles
    });
  };
}

function requirePermission(...permissions) {
  const required = permissions.flat().map(String).filter(Boolean);

  return function permissionGuard(req, res, next) {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication context missing" });

    const userRole = normalizeRole(req.user.role);
    if (["admin", "developer"].includes(userRole)) return next();

    if (!isRbacEnabled()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Dynamic RBAC is disabled and this route requires admin/developer fallback."
      });
    }

    const userPermissions = new Set(normalizePermissions(req.user.permissions));
    const hasPermission = required.some((permission) => userPermissions.has(permission) || userPermissions.has("admin:*"));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Access denied: missing required permission",
        requiredPermissions: required
      });
    }

    return next();
  };
}

function optionalRBAC(...permissionsOrRoles) {
  return async function optionalRbacGuard(req, res, next) {
    if (!isRbacEnabled()) return next();

    await requireAuth(req, res, function afterAuth(error) {
      if (error) return next(error);
      requireActiveAccount(req, res, function afterActive(activeError) {
        if (activeError) return next(activeError);
        if (!permissionsOrRoles.length) return next();
        return requirePermission(...permissionsOrRoles)(req, res, next);
      });
    });
  };
}

module.exports = {
  isRbacEnabled,
  requireAuth,
  requireRole,
  requirePermission,
  requireActiveAccount,
  optionalRBAC
};
