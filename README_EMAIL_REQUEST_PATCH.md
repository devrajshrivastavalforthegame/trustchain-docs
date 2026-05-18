# TrustChain Docs - Email-Based Verification Request Patch

Extract this ZIP directly inside your existing `TrustChain-Docss` project root.
It replaces only these files:

- `server/routes/verificationRoutes.js`
- `server/db/security-migration.sql`
- `client/src/pages/EmployerVerify.tsx`
- `client/src/services/verificationService.ts`
- `client/src/services/fallbackStore.ts`

## What changed

1. Verification consent requests are now routed by Student Gmail/email.
2. Student email is required before sending a request.
3. Hash/file is optional during request creation and is used only for final tamper-proof verification.
4. Student dashboard receives only requests where `student_email` matches logged-in student email.
5. Student approval checks whether the optional submitted hash belongs to an active credential for that same email.
6. Direct Verify API still supports strict file/hash verification.

## Run this SQL after extracting

Run `server/db/security-migration.sql` in your `trustchain` PostgreSQL database.

## Test flow

1. Issuer uploads credential with student email `student@gmail.com`.
2. Employer enters `student@gmail.com` and sends consent request.
3. Student logs in with same email and sees the request.
4. Student approves/rejects.
5. If a hash/file was attached, backend compares it against credentials issued to that exact email.
