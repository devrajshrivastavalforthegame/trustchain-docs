const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { getRefreshCookie, verifyRefreshToken, hashRefreshToken, validateRefreshCsrf, revokeRefreshToken, revokeAllUserRefreshTokens, clearRefreshCookies, issueTokenPair } = require('../utils/jwt');
const { getUserPermissions } = require('../middleware/auth.middleware');

const NEEDS_APPROVAL = new Set(['issuer', 'employer', 'admin']);
const safeUser = (u, permissions=[]) => ({ id:u.id, name:u.name, email:u.email, role:u.role_name || u.role, roleId:u.role_id || null, status:u.status, permissions, createdAt:u.created_at });
const normRole = r => String(r || 'student').trim().toLowerCase();

async function findUserByEmail(email) {
  const r = await db.query(
    `SELECT u.id,u.name,u.email,u.password,u.role,u.role_id,u.status,u.token_version,u.created_at,COALESCE(r.name,u.role) AS role_name
     FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE LOWER(u.email)=LOWER($1) LIMIT 1`, [email]
  );
  return r.rows[0] || null;
}
async function findUserById(id) {
  const r = await db.query(
    `SELECT u.id,u.name,u.email,u.password,u.role,u.role_id,u.status,u.token_version,u.created_at,COALESCE(r.name,u.role) AS role_name
     FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=$1 LIMIT 1`, [id]
  );
  return r.rows[0] || null;
}
async function roleId(role) {
  const r = await db.query('SELECT id FROM roles WHERE LOWER(name)=LOWER($1) LIMIT 1', [role]);
  return r.rows[0]?.id || null;
}

async function register(req, res) {
  try {
    const { name, email, password, role='student' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success:false, code:'MISSING_FIELDS', message:'Name, email and password are required.' });
    if (String(password).length < 8) return res.status(400).json({ success:false, code:'WEAK_PASSWORD', message:'Password must be at least 8 characters.' });
    if (await findUserByEmail(email)) return res.status(409).json({ success:false, code:'EMAIL_EXISTS', message:'Email already registered.' });

    const r = normRole(role);
    const status = NEEDS_APPROVAL.has(r) ? 'pending' : 'approved';
    const created = await db.query(
      `INSERT INTO users (name,email,password,role,role_id,status,token_version,created_at,updated_at)
       VALUES ($1,LOWER($2),$3,$4,$5,$6,0,NOW(),NOW())
       RETURNING id,name,email,role,role_id,status,token_version,created_at`,
      [name.trim(), email.trim(), await bcrypt.hash(password, 12), r, await roleId(r), status]
    );
    const user = created.rows[0];
    if (status === 'pending') return res.status(202).json({ success:true, code:'ACCOUNT_PENDING', message:'Account is pending admin approval.', user:safeUser(user, []) });
    const permissions = await getUserPermissions(user.id);
    const pair = await issueTokenPair({ db, user, permissions, req, res });
    res.status(201).json({ success:true, message:'Account created.', accessToken:pair.accessToken, user:safeUser(user, permissions) });
  } catch (e) {
    console.error('register', e);
    res.status(500).json({ success:false, code:'REGISTER_FAILED', message:'Registration failed.' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = email ? await findUserByEmail(email) : null;
    if (!user || !(await bcrypt.compare(password || '', user.password))) return res.status(401).json({ success:false, code:'INVALID_CREDENTIALS', message:'Invalid email or password.' });
    if (user.status === 'pending') return res.status(403).json({ success:false, code:'ACCOUNT_PENDING', message:'Your account is pending admin approval.', user:safeUser(user, []) });
    if (user.status === 'rejected') return res.status(403).json({ success:false, code:'ACCOUNT_REJECTED', message:'Your account request was rejected.', user:safeUser(user, []) });
    if (user.status !== 'approved') return res.status(403).json({ success:false, code:'ACCOUNT_NOT_APPROVED', message:'Your account is not approved.', user:safeUser(user, []) });
    const permissions = await getUserPermissions(user.id);
    const pair = await issueTokenPair({ db, user, permissions, req, res });
    res.json({ success:true, message:'Login successful.', accessToken:pair.accessToken, user:safeUser(user, permissions) });
  } catch (e) {
    console.error('login', e);
    res.status(500).json({ success:false, code:'LOGIN_FAILED', message:'Login failed.' });
  }
}

async function refreshToken(req, res) {
  const token = getRefreshCookie(req);
  try {
    if (!token) return res.status(401).json({ success:false, code:'REFRESH_TOKEN_MISSING', message:'Refresh token missing.' });
    const payload = verifyRefreshToken(token);
    if (!validateRefreshCsrf(req, payload)) { await revokeRefreshToken(db, token, 'csrf_failed'); clearRefreshCookies(res); return res.status(403).json({ success:false, code:'CSRF_VALIDATION_FAILED', message:'CSRF validation failed.' }); }
    const record = await db.query('SELECT * FROM refresh_tokens WHERE token_hash=$1 LIMIT 1', [hashRefreshToken(token)]);
    const stored = record.rows[0];
    if (!stored || stored.revoked_at || new Date(stored.expires_at) <= new Date()) { await revokeAllUserRefreshTokens(db, payload.userId, 'refresh_reuse_or_expired'); clearRefreshCookies(res); return res.status(401).json({ success:false, code:'REFRESH_TOKEN_REVOKED', message:'Session expired. Please log in again.' }); }
    const user = await findUserById(payload.userId);
    if (!user || user.status !== 'approved' || (user.token_version || 0) !== (payload.tokenVersion || 0)) { await revokeRefreshToken(db, token, 'user_not_approved_or_version_changed'); clearRefreshCookies(res); return res.status(401).json({ success:false, code:'SESSION_REVOKED', message:'Session revoked. Please log in again.' }); }
    await revokeRefreshToken(db, token, 'rotated');
    const permissions = await getUserPermissions(user.id);
    const pair = await issueTokenPair({ db, user, permissions, req, res });
    res.json({ success:true, message:'Access token refreshed.', accessToken:pair.accessToken, user:safeUser(user, permissions) });
  } catch (e) {
    clearRefreshCookies(res);
    res.status(401).json({ success:false, code:'REFRESH_FAILED', message:'Could not refresh session.' });
  }
}

async function logout(req, res) {
  try { await revokeRefreshToken(db, getRefreshCookie(req), 'logout'); } catch {}
  clearRefreshCookies(res);
  res.json({ success:true, message:'Logged out.' });
}

module.exports = { register, login, refreshToken, logout };
