# TrustChain Docs Patchwork ZIP

This patch adds dynamic RBAC, access-token/refresh-token authentication, and manual approval for issuer/employer/admin sign-ups.

## Backend setup

Install missing packages:

```bash
npm install jsonwebtoken bcryptjs cookie-parser
```

Run SQL migration:

```sql
backend/db/dynamic-rbac-refresh-schema.sql
```

Add env values:

```env
JWT_ACCESS_SECRET=<48-byte-random-base64-or-long-secret>
JWT_REFRESH_SECRET=<different-48-byte-random-base64-or-long-secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
REFRESH_COOKIE_NAME=trustchain_refresh
CSRF_COOKIE_NAME=trustchain_csrf
```

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

In `app.js` add cookie parser and credential CORS:

```js
const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
```

## Suggested route wiring

```js
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/refresh-token', authController.refreshToken);
router.post('/auth/logout', authController.logout);
router.get('/admin/users/pending', authenticate, requireAnyPermission('admin:*','admin:read_pending_users','users:approve'), adminController.getPendingUsers);
router.patch('/admin/users/:userId/approve', authenticate, requireAnyPermission('admin:*','users:approve'), adminController.approveUser);
router.patch('/admin/users/:userId/reject', authenticate, requireAnyPermission('admin:*','users:approve'), adminController.rejectUser);
```

## Security behavior

- Access token is short lived and kept in frontend memory.
- Refresh token is stored as an HTTP-only cookie, never localStorage.
- Refresh token is hashed in the database and rotated on every refresh.
- CSRF protection uses a double-submit `trustchain_csrf` token header.
- Pending/rejected accounts cannot log in.
- Roles and permissions are loaded dynamically from PostgreSQL.
