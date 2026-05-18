# Real Project Fix Patch Notes

## Fixed high-priority issues

1. **Blockchain mock transaction removed**
   - `server/services/polygonService.js` no longer fabricates fake transaction hashes.
   - It returns `confirmed`, `pending`, `unconfigured`, or `failed` status.
   - Documents are still saved when chain is unavailable, but the response clearly says blockchain is pending/failed.

2. **Smart contract input bug fixed**
   - `issuerController.js` now creates a deterministic SHA-256 `studentIdHash` from enrollment/email.
   - This satisfies `DocumentVerification.issueDocument()` which requires student mapping.

3. **Employer file encryption fixed**
   - `client/src/services/verificationService.ts` now encrypts employer direct verification files when API wrapper encryption is enabled.
   - `server/controllers/userController.js` decrypts before hashing, so tamper detection still uses raw original bytes.

4. **AI cannot overwrite verification status**
   - AI classification is returned as `aiStatus`.
   - Backend final status remains `verified`, `tampered`, `pending`, or `rejected`.

5. **AI provider visibility improved**
   - Frontend now shows whether result came from Backend fallback, FastAPI rule engine, or Ollama LLM.
   - Node AI gateway preserves `llmUsed` from FastAPI.

6. **Demo fallback disabled**
   - `VITE_ENABLE_DEMO_FALLBACK=false` by default.
   - Frontend now surfaces backend/API failures instead of silently simulating results.

7. **Database schema added**
   - `server/db/schema.sql` creates the base tables and indexes.
   - `npm run db:schema` and `npm run db:seed` scripts were added.

8. **Environment safety improved**
   - Uploaded `.env` files were sanitized/rebuilt.
   - Key generation script added with `npm run keys`.
   - Demo encryption key fallback is disabled unless `ALLOW_INSECURE_DEMO_KEYS=true`.

9. **Hardhat fixed**
   - `hardhat.config.js` now includes local and Polygon Amoy network configuration.
   - `Scripts/deploy.js` imports Hardhat explicitly and prints the contract address for `.env`.

## Files changed

- `server/services/polygonService.js`
- `server/controllers/issuerController.js`
- `server/controllers/userController.js`
- `server/services/aiIntegrityService.js`
- `server/middleware/encryptedApiWrapper.js`
- `server/services/apiWrapperCrypto.js`
- `server/services/cryptoService.js`
- `server/db/schema.sql`
- `server/db/security-migration.sql`
- `server/scripts/generateKeys.js`
- `server/scripts/seedDemoUsers.js`
- `server/package.json`
- `client/src/services/verificationService.ts`
- `client/src/components/VerificationCard.tsx`
- `client/src/config/env.ts`
- `client/.env`
- `client/.env.example`
- `server/.env`
- `server/.env.example`
- `hardhat.config.js`
- `Scripts/deploy.js`
- `package.json`
- `README.md`
