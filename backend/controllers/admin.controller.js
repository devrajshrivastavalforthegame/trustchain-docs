const db = require('../config/db');
const { revokeAllUserRefreshTokens } = require('../utils/jwt');
const { getUserPermissions } = require('../middleware/auth.middleware');

const publicUser = (u, permissions=[]) => ({ id:u.id, name:u.name, email:u.email, role:u.role_name || u.role, roleId:u.role_id || null, status:u.status, permissions, createdAt:u.created_at, updatedAt:u.updated_at, approvedAt:u.approved_at, rejectedAt:u.rejected_at });

async function getPendingUsers(req, res) {
  try {
    const r = await db.query(`SELECT u.id,u.name,u.email,u.role,u.role_id,u.status,u.created_at,u.updated_at,COALESCE(r.name,u.role) AS role_name FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.status='pending' ORDER BY u.created_at ASC`);
    res.json({ success:true, pendingUsers:r.rows.map(u => publicUser(u)) });
  } catch (e) { res.status(500).json({ success:false, code:'PENDING_USERS_FAILED', message:'Failed to fetch pending users.' }); }
}

async function approveUser(req, res) {
  try {
    const r = await db.query(`UPDATE users SET status='approved', approved_by=$2, approved_at=NOW(), rejected_by=NULL, rejected_at=NULL, rejection_reason=NULL, updated_at=NOW(), token_version=COALESCE(token_version,0)+1 WHERE id=$1 RETURNING id,name,email,role,role_id,status,created_at,updated_at,approved_at`, [req.params.userId, req.user.id]);
    if (!r.rows.length) return res.status(404).json({ success:false, code:'USER_NOT_FOUND', message:'User not found.' });
    const permissions = await getUserPermissions(r.rows[0].id);
    res.json({ success:true, message:'User approved successfully.', user:publicUser(r.rows[0], permissions) });
  } catch (e) { res.status(500).json({ success:false, code:'APPROVE_USER_FAILED', message:'Failed to approve user.' }); }
}

async function rejectUser(req, res) {
  try {
    const reason = req.body?.reason || 'Rejected by administrator';
    const r = await db.query(`UPDATE users SET status='rejected', rejected_by=$2, rejected_at=NOW(), rejection_reason=$3, approved_by=NULL, approved_at=NULL, updated_at=NOW(), token_version=COALESCE(token_version,0)+1 WHERE id=$1 RETURNING id,name,email,role,role_id,status,created_at,updated_at,rejected_at,rejection_reason`, [req.params.userId, req.user.id, reason]);
    if (!r.rows.length) return res.status(404).json({ success:false, code:'USER_NOT_FOUND', message:'User not found.' });
    await revokeAllUserRefreshTokens(db, req.params.userId, 'account_rejected');
    res.json({ success:true, message:'User rejected successfully.', user:publicUser(r.rows[0], []) });
  } catch (e) { res.status(500).json({ success:false, code:'REJECT_USER_FAILED', message:'Failed to reject user.' }); }
}

async function getDynamicRolesAndPermissions(req, res) {
  try {
    const r = await db.query(`SELECT r.id,r.name,r.description,COALESCE(JSON_AGG(p.name ORDER BY p.name) FILTER (WHERE p.id IS NOT NULL),'[]') AS permissions FROM roles r LEFT JOIN role_permissions rp ON rp.role_id=r.id LEFT JOIN permissions p ON p.id=rp.permission_id GROUP BY r.id ORDER BY r.name`);
    res.json({ success:true, roles:r.rows });
  } catch (e) { res.status(500).json({ success:false, code:'ROLES_FETCH_FAILED', message:'Failed to fetch roles.' }); }
}
module.exports = { getPendingUsers, approveUser, rejectUser, getDynamicRolesAndPermissions };
