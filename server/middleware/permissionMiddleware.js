const pool = require("../config/db");

function requireAnyPermission(...requiredPermissions) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required"
        });
      }

      const fallbackAllowedRoles = ["developer", "admin"];
      const userId = req.user.id;
      const userRole = req.user.role;

      try {
        const result = await pool.query(
          `
          SELECT DISTINCT p.name
          FROM users u
          LEFT JOIN user_roles ur ON ur.user_id = u.id
          LEFT JOIN roles r ON r.id = ur.role_id OR r.name = u.role
          LEFT JOIN role_permissions rp ON rp.role_id = r.id
          LEFT JOIN permissions p ON p.id = rp.permission_id
          WHERE u.id = $1
          `,
          [userId]
        );

        const permissions = result.rows
          .map((row) => row.name)
          .filter(Boolean);

        const hasPermission = requiredPermissions.some((permission) =>
          permissions.includes(permission)
        );

        const hasWildcard = permissions.includes("admin:*");

        if (hasPermission || hasWildcard) {
          return next();
        }
      } catch (error) {
        console.warn("Dynamic RBAC lookup failed, using role fallback:", error.message);
      }

      if (fallbackAllowedRoles.includes(userRole)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: "Access denied: missing required permission",
        requiredPermissions
      });
    } catch (error) {
      console.error("Permission middleware error:", error);
      return res.status(500).json({
        success: false,
        message: "Permission check failed"
      });
    }
  };
}

module.exports = { requireAnyPermission };