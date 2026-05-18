# Patch Manifest — trustchain-all-security-patches-safe.zip

## Added files

```txt
APPLY_SECURITY_PATCH.bat
README_APPLY.md
PATCH_MANIFEST.md
server/middleware/trustchainSecurityCors.js
server/middleware/trustchainRateLimiter.js
server/middleware/trustchainOptionalRbac.js
server/middleware/trustchainCryptoWrapper.js
server/utils/trustchainCryptoHash.js
server/routes/securityDemoRoutes.js
server/scripts/applyAllSecurityPatchesSafe.cjs
server/db/optional_dynamic_rbac_schema.sql
server/.env.example.security-additions
```

## Modified files after running installer

```txt
server/app.js
server/.env.example
server/package.json only if missing required dependencies
```

The installer creates backups before editing.

## Active by default

```env
ENABLE_SECURE_CORS=true
ENABLE_RATE_LIMIT=true
ENABLE_CRYPTO_HASH=true
```

## Disabled by default

```env
ENABLE_RBAC=false
API_RESPONSE_ENCRYPTION=false
```

## Dependency policy

The current TrustChain Docs backend already has the required dependencies:

```txt
cors
express-rate-limit
jsonwebtoken
```

The installer adds them to `server/package.json` only if missing.

## Safety notes

- The patch is CommonJS-compatible.
- It does not require a database migration for normal demo use.
- It does not encrypt normal API responses unless explicitly enabled.
- It does not enforce full dynamic RBAC unless explicitly enabled.
- It does not overwrite `.env`.
