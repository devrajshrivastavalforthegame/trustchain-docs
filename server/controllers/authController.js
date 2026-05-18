const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const ROLES_NEEDING_APPROVAL = ["issuer", "employer", "admin", "developer"];

function normalizeRole(role) {
  return String(role || "student").trim().toLowerCase();
}

function createAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn:
        process.env.ACCESS_TOKEN_EXPIRY ||
        process.env.JWT_EXPIRY ||
        "15m",
    }
  );
}

function createRawRefreshToken() {
  return crypto.randomBytes(64).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());

  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split("=");

    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
}

function setRefreshCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge:
      Number(process.env.REFRESH_TOKEN_DAYS || 7) *
      24 *
      60 *
      60 *
      1000,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
  });
}

async function saveRefreshToken(userId, rawRefreshToken) {
  const tokenHash = hashToken(rawRefreshToken);
  const refreshDays = Number(process.env.REFRESH_TOKEN_DAYS || 7);

  await pool.query(
    `
    INSERT INTO refresh_tokens(user_id, token_hash, expires_at)
    VALUES($1, $2, NOW() + ($3 || ' days')::INTERVAL)
    `,
    [userId, tokenHash, refreshDays]
  );
}

function ensureApprovedUser(user) {
  const normalizedRole = normalizeRole(user.role);
  const userStatus = user.status || "approved";

  if (
    ROLES_NEEDING_APPROVAL.includes(normalizedRole) &&
    userStatus !== "approved"
  ) {
    return {
      allowed: false,
      message:
        userStatus === "rejected"
          ? "Account rejected by admin"
          : "Account pending approval",
    };
  }

  return {
    allowed: true,
    message: "Allowed",
  };
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedRole = normalizeRole(role);

    const existing = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const status = ROLES_NEEDING_APPROVAL.includes(normalizedRole)
      ? "pending"
      : "approved";

    const result = await pool.query(
      `
      INSERT INTO users(name, email, password, role, status)
      VALUES($1, $2, $3, $4, $5)
      RETURNING id, name, email, role, status, created_at
      `,
      [name, normalizedEmail, hashedPassword, normalizedRole, status]
    );

    const user = result.rows[0];

    if (status === "pending") {
      return res.status(201).json({
        success: true,
        requiresApproval: true,
        message:
          "Registration successful. Your account is pending admin approval.",
        user,
      });
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRawRefreshToken();

    await saveRefreshToken(user.id, refreshToken);
    setRefreshCookie(res, refreshToken);

    return res.status(201).json({
      success: true,
      token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const result = await pool.query(
      "SELECT id, name, email, password, role, status FROM users WHERE LOWER(email) = LOWER($1)",
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const approval = ensureApprovedUser(user);

    if (!approval.allowed) {
      return res.status(403).json({
        success: false,
        message: approval.message,
      });
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRawRefreshToken();

    await saveRefreshToken(user.id, refreshToken);
    setRefreshCookie(res, refreshToken);

    return res.json({
      success: true,
      token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status || "approved",
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const oldRefreshToken = getCookie(req, "refreshToken");

    if (!oldRefreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    const oldTokenHash = hashToken(oldRefreshToken);

    const tokenResult = await pool.query(
      `
      SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at,
             u.name, u.email, u.role, u.status
      FROM refresh_tokens rt
      JOIN users u ON u.id = rt.user_id
      WHERE rt.token_hash = $1
      LIMIT 1
      `,
      [oldTokenHash]
    );

    if (tokenResult.rows.length === 0) {
      clearRefreshCookie(res);

      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const tokenRow = tokenResult.rows[0];

    if (tokenRow.revoked_at) {
      clearRefreshCookie(res);

      return res.status(401).json({
        success: false,
        message: "Refresh token already revoked",
      });
    }

    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      clearRefreshCookie(res);

      return res.status(401).json({
        success: false,
        message: "Refresh token expired",
      });
    }

    const user = {
      id: tokenRow.user_id,
      name: tokenRow.name,
      email: tokenRow.email,
      role: tokenRow.role,
      status: tokenRow.status,
    };

    const approval = ensureApprovedUser(user);

    if (!approval.allowed) {
      clearRefreshCookie(res);

      return res.status(403).json({
        success: false,
        message: approval.message,
      });
    }

    await pool.query(
      "UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1",
      [tokenRow.id]
    );

    const newRefreshToken = createRawRefreshToken();
    const newAccessToken = createAccessToken(user);

    await saveRefreshToken(user.id, newRefreshToken);
    setRefreshCookie(res, newRefreshToken);

    return res.json({
      success: true,
      token: newAccessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status || "approved",
      },
    });
  } catch (error) {
    console.error("REFRESH TOKEN ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.logout = async (req, res) => {
  try {
    const refreshToken = getCookie(req, "refreshToken");

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);

      await pool.query(
        "UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = $1 AND revoked_at IS NULL",
        [tokenHash]
      );
    }

    clearRefreshCookie(res);

    return res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};