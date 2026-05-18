const db = require('../config/db');
const { verifyAccessToken } = require('../utils/jwt');

function bearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
}

async function getUser(userId) {
  const r = await db.query(
    `SELECT u.id,u.name,u.email,u.role,u.role_id,u.status,u.token_version,COALESCE(r.name,u.role) AS role_name
     FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id=$1 LIMIT 1`,
    [userId]
  );
  return r.rows[0] || null;
}

async function getUserPermissions(userId) {
  const r = await db.query(
    `WITH u AS (SELECT id, role, role_id FROM users WHERE id=$1),
      rp AS (
        SELECT p.name, TRUE AS allowed FROM u
        JOIN roles r ON r.id=u.role_id OR LOWER(r.name)=LOWER(COALESCE(u.role,''))
        JOIN role_permissions x ON x.role_id=r.id
        JOIN permissions p ON p.id=x.permission_id
      ),
      up AS (
        SELECT p.name, COALESCE(x.allowed, TRUE) AS allowed FROM user_permissions x
        JOIN permissions p ON p.id=x.permission_id WHERE x.user_id=$1
      ),
      combined AS (SELECT * FROM rp UNION ALL SELECT * FROM up)
     SELECT name FROM combined GROUP BY name HAVING BOOL_AND(allowed)=TRUE ORDER BY name`,
    [userId]
  );
  return r.rows.map(x => x.name);
}

async function authenticate(req, res, next) {
  try {
    const token = bearer(req);
    if (!token) return res.status(401).json({ success:false, code:'ACCESS_TOKEN_MISSING', message:'Access token is required.' });
    const payload = verifyAccessToken(token);
    const user = await getUser(payload.userId || payload.sub);
    if (!user) return res.status(401).json({ success:false, code:'USER_NOT_FOUND', message:'User not found.' });
    if (user.status !== 'approved') {
      return res.status(403).json({ success:false, code:user.status === 'pending' ? 'ACCOUNT_PENDING' : 'ACCOUNT_NOT_APPROVED', message:user.status === 'pending' ? 'Your account is pending admin approval.' : 'Your account is not approved.' });
    }
    if ((user.token_version || 0) !== (payload.tokenVersion || 0)) {
      return res.status(401).json({ success:false, code:'TOKEN_REVOKED', message:'Session revoked. Please log in again.' });
    }
    const permissions = await getUserPermissions(user.id);
    req.user = { id:user.id, name:user.name, email:user.email, role:user.role_name || user.role, roleId:user.role_id, status:user.status, permissions };
    next();
  } catch (e) {
    return res.status(401).json({ success:false, code:'ACCESS_TOKEN_INVALID', message:'Invalid or expired access token.' });
  }
}

function requirePermission(...perms) {
  return (req, res, next) => {
    const userPerms = req.user?.permissions || [];
    const ok = perms.every(p => userPerms.includes(p));
    if (!ok) return res.status(403).json({ success:false, code:'PERMISSION_DENIED', message:'Permission denied.', requiredPermissions:perms });
    next();
  };
}

function requireAnyPermission(...perms) {
  return (req, res, next) => {
    const userPerms = req.user?.permissions || [];
    const ok = perms.some(p => userPerms.includes(p));
    if (!ok) return res.status(403).json({ success:false, code:'PERMISSION_DENIED', message:'Permission denied.', allowedPermissions:perms });
    next();
  };
}

function requireApprovedAccount(req, res, next) {
  if (req.user?.status !== 'approved') return res.status(403).json({ success:false, code:'ACCOUNT_NOT_APPROVED', message:'Account approval is required.' });
  next();
}

function requireResourceOwner(resolveOwnerId) {
  return async (req, res, next) => {
    try {
      const ownerId = await resolveOwnerId(req);
      if (String(ownerId) !== String(req.user.id)) return res.status(403).json({ success:false, code:'OWNERSHIP_REQUIRED', message:'You can only access your own resource.' });
      next();
    } catch {
      res.status(500).json({ success:false, code:'OWNERSHIP_CHECK_FAILED', message:'Ownership check failed.' });
    }
  };
}

module.exports = { authenticate, requirePermission, requireAnyPermission, requireApprovedAccount, requireResourceOwner, getUserPermissions };
