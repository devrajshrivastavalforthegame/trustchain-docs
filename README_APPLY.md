# TrustChain Docs — All Security Patches Safe Combined ZIP

This patch combines the 5 separate security patches into one safer, demo-friendly package:

1. Dynamic RBAC / permissions helpers
2. AES-256-GCM API wrapper utilities
3. Secure CORS configuration
4. Route-aware rate limiting
5. SHA-256 document hashing and optional HMAC signing

It is designed for the TrustChain Docs project structure with a Node/Express backend under `server/` and React/Vite frontend under `client/`.

## Why this patch is safe for your jury demo

Active by default:

- Secure CORS
- Rate limiting
- Crypto hash utility
- Security demo endpoint

Present but disabled by default:

- Full dynamic RBAC enforcement: `ENABLE_RBAC=false`
- API response encryption: `API_RESPONSE_ENCRYPTION=false`

This is intentional. Login, signup approval, document upload, verification, and frontend API calls should not break after applying the patch.

## Apply steps

Extract this ZIP directly inside your project folder:

```txt
C:\TrustChain-Docs
```

Then run:

```bat
cd C:\TrustChain-Docs
APPLY_SECURITY_PATCH.bat
```

Or manually:

```bat
cd C:\TrustChain-Docs
node server\scripts\applyAllSecurityPatchesSafe.cjs
```

Then:

```bat
cd C:\TrustChain-Docs\server
npm install
npm run dev
```

## What the installer changes

The installer safely edits `server/app.js` only by inserting security imports/middleware and route limiters. It creates backups here:

```txt
server\.patch-backups\security-safe-YYYYMMDD-HHMMSS
```

It also updates `server/.env.example` with safe feature flags.

It does **not** overwrite your `.env`.

## Required `.env` demo-safe values

For jury demo, keep these values in `server/.env`:

```env
ENABLE_RBAC=false
API_RESPONSE_ENCRYPTION=false
ENABLE_RATE_LIMIT=true
ENABLE_SECURE_CORS=true
ENABLE_CRYPTO_HASH=true
JWT_EXPIRY=15m
ACCESS_TOKEN_EXPIRY=15m
```

Optional HMAC signing:

```env
DOCUMENT_HMAC_SECRET=replace-with-long-random-secret
```

Optional API wrapper encryption later:

```env
API_RESPONSE_ENCRYPTION=true
API_WRAPPER_KEY=32-byte-base64-or-64-hex-key
```

Do not turn this on unless frontend envelope decryption is also enabled.

## Test commands

Health route:

```bat
curl http://localhost:5000/api/health
```

Security health route:

```bat
curl http://localhost:5000/api/security/health
```

Hash demo route:

```bat
curl -X POST http://localhost:5000/api/security/hash-demo -H "Content-Type: application/json" -d "{\"text\":\"TrustChain Docs demo file\"}"
```

Expected: a SHA-256 hash.

CORS preflight test:

```bat
curl -i -X OPTIONS http://localhost:5000/api/health -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: GET"
```

Expected: `Access-Control-Allow-Origin: http://localhost:5173`.

Login rate limiter smoke test:

```bat
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"wrong@test.com\",\"password\":\"wrong\"}"
```

If you want to demonstrate 429 quickly, temporarily set this in `server/.env`:

```env
RATE_LIMIT_AUTH_MAX=3
```

Restart backend, then run the wrong login command several times.

Node crypto hash test:

```bat
cd C:\TrustChain-Docs\server
node -e "const h=require('./utils/trustchainCryptoHash'); console.log(h.hashString('TrustChain Docs'))"
```

## Judge Demo Security Talking Points

### Brute-force protection

Auth routes use a stricter limiter. Wrong login attempts eventually return a clear JSON 429 error instead of allowing unlimited guessing.

### Secure CORS

The backend accepts only configured frontend origins and common localhost Vite/React origins. It does not use wildcard origin with credentials.

### Document hash verification

Documents can be fingerprinted using SHA-256. The hash changes completely if the document content changes, so tampering is detectable.

### Optional encrypted API wrapper

AES-256-GCM wrapper utilities are present but disabled by default because encrypted responses require matching frontend decryption. This prevents breaking the live demo.

### Optional dynamic RBAC

RBAC helpers are present and can check DB permission tables if enabled. If tables are missing, the helper falls back safely to role checks instead of crashing.

### Account approval safety

Your existing signup approval flow protects the platform from fake issuers/employers. A new issuer/employer should remain pending until admin/developer approval.

## How to enable advanced RBAC later

1. Create roles/permissions tables using `server/db/optional_dynamic_rbac_schema.sql`.
2. Assign permissions to roles.
3. Set:

```env
ENABLE_RBAC=true
```

4. Use middleware from:

```js
const { requireAuth, requireRole, requirePermission, requireActiveAccount } = require('./middleware/trustchainOptionalRbac');
```

## How to enable encrypted API wrapper later

1. Generate a 32-byte key:

```bat
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

2. Put it in backend `.env`:

```env
API_RESPONSE_ENCRYPTION=true
API_WRAPPER_KEY=PASTE_KEY_HERE
```

3. Put the same key in frontend `.env` as:

```env
VITE_API_WRAPPER_ENCRYPTION=true
VITE_API_WRAPPER_KEY=PASTE_KEY_HERE
```

4. Add frontend decrypt interceptor before using encrypted responses.

For jury day, keep encryption off unless you already tested the frontend decrypt path.

## Rollback

Restore the backed-up `app.js` and `.env.example` from:

```txt
server\.patch-backups\security-safe-YYYYMMDD-HHMMSS
```

The added files are isolated and can be deleted safely:

```txt
server/middleware/trustchainSecurityCors.js
server/middleware/trustchainRateLimiter.js
server/middleware/trustchainOptionalRbac.js
server/middleware/trustchainCryptoWrapper.js
server/utils/trustchainCryptoHash.js
server/routes/securityDemoRoutes.js
server/scripts/applyAllSecurityPatchesSafe.cjs
server/db/optional_dynamic_rbac_schema.sql
```
