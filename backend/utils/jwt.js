const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'trustchain_refresh';
const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'trustchain_csrf';
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function env(name) {
  const value = process.env[name];
  if (!value || value.length < 32) throw new Error(`${name} must be at least 32 chars`);
  return value;
}

function cookieBase(path = '/') {
  const production = process.env.NODE_ENV === 'production';
  return { httpOnly: true, secure: production, sameSite: production ? 'strict' : 'lax', path };
}

function csrfCookieBase() {
  const production = process.env.NODE_ENV === 'production';
  return { httpOnly: false, secure: production, sameSite: production ? 'strict' : 'lax', path: '/' };
}

function publicClaims(user) {
  return {
    sub: String(user.id),
    userId: user.id,
    email: user.email,
    role: user.role_name || user.role,
    roleId: user.role_id || null,
    status: user.status,
    tokenVersion: user.token_version || 0,
  };
}

function generateAccessToken(user, permissions = []) {
  return jwt.sign(
    { ...publicClaims(user), permissions, type: 'access' },
    env('JWT_ACCESS_SECRET'),
    { expiresIn: ACCESS_EXPIRES, issuer: process.env.JWT_ISSUER || 'trustchain-docs', audience: process.env.JWT_AUDIENCE || 'trustchain-users' }
  );
}

function generateRefreshToken(user, csrfToken) {
  return jwt.sign(
    { ...publicClaims(user), type: 'refresh', csrf: csrfToken, jti: crypto.randomUUID() },
    env('JWT_REFRESH_SECRET'),
    { expiresIn: REFRESH_EXPIRES, issuer: process.env.JWT_ISSUER || 'trustchain-docs', audience: process.env.JWT_AUDIENCE || 'trustchain-users' }
  );
}

function verifyAccessToken(token) {
  const payload = jwt.verify(token, env('JWT_ACCESS_SECRET'), { issuer: process.env.JWT_ISSUER || 'trustchain-docs', audience: process.env.JWT_AUDIENCE || 'trustchain-users' });
  if (payload.type !== 'access') throw new Error('Invalid access token type');
  return payload;
}

function verifyRefreshToken(token) {
  const payload = jwt.verify(token, env('JWT_REFRESH_SECRET'), { issuer: process.env.JWT_ISSUER || 'trustchain-docs', audience: process.env.JWT_AUDIENCE || 'trustchain-users' });
  if (payload.type !== 'refresh') throw new Error('Invalid refresh token type');
  return payload;
}

function createCsrfToken() { return crypto.randomBytes(32).toString('base64url'); }
function hashRefreshToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
function expiryFromJwt(token) { return new Date(jwt.decode(token).exp * 1000); }

async function storeRefreshToken(db, userId, refreshToken, req) {
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent, created_at)
     VALUES ($1,$2,$3,$4,$5,NOW())`,
    [userId, hashRefreshToken(refreshToken), expiryFromJwt(refreshToken), req?.ip || null, req?.headers?.['user-agent'] || null]
  );
}

async function revokeRefreshToken(db, refreshToken, reason = 'revoked') {
  if (!refreshToken) return;
  await db.query(
    `UPDATE refresh_tokens SET revoked_at = NOW(), revoked_reason = $2 WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hashRefreshToken(refreshToken), reason]
  );
}

async function revokeAllUserRefreshTokens(db, userId, reason = 'user_revoked') {
  await db.query(
    `UPDATE refresh_tokens SET revoked_at = NOW(), revoked_reason = $2 WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId, reason]
  );
}

function setRefreshCookies(res, refreshToken, csrfToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, { ...cookieBase('/api/auth/refresh-token'), maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.cookie(CSRF_COOKIE_NAME, csrfToken, { ...csrfCookieBase(), maxAge: 7 * 24 * 60 * 60 * 1000 });
}

function clearRefreshCookies(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, cookieBase('/api/auth/refresh-token'));
  res.clearCookie(CSRF_COOKIE_NAME, csrfCookieBase());
}

function getRefreshCookie(req) { return req.cookies?.[REFRESH_COOKIE_NAME] || null; }

function validateRefreshCsrf(req, refreshPayload) {
  const header = req.headers['x-csrf-token'];
  const cookie = req.cookies?.[CSRF_COOKIE_NAME];
  return Boolean(header && cookie && header === cookie && refreshPayload.csrf === cookie);
}

async function issueTokenPair({ db, user, permissions, req, res }) {
  const csrfToken = createCsrfToken();
  const accessToken = generateAccessToken(user, permissions);
  const refreshToken = generateRefreshToken(user, csrfToken);
  await storeRefreshToken(db, user.id, refreshToken, req);
  setRefreshCookies(res, refreshToken, csrfToken);
  return { accessToken, csrfToken };
}

module.exports = {
  REFRESH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashRefreshToken,
  createCsrfToken,
  storeRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  setRefreshCookies,
  clearRefreshCookies,
  getRefreshCookie,
  validateRefreshCsrf,
  issueTokenPair,
};
