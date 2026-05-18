# TrustChain Docs - Tamper Detection and AI Explanation Fix

This build fixes the verification bug where an edited/tampered document could still appear as verified.

## What changed

1. Backend verification now calculates SHA-256 from the uploaded file bytes and never lets a client-sent hash override it.
2. Direct verification from the employer page now sends the actual selected file as multipart/form-data.
3. Enrollment-only lookup no longer returns `verified`; it returns metadata-only / record-found behavior and asks for a file/hash for tamper-proof verification.
4. Superseded/revoked documents are no longer treated as active verified credentials.
5. AI Integrity fields are returned with every verification result as an explanation layer: score, risk level, matched/mismatched fields, summary, and explanation.
6. The VerificationCard UI now displays the AI explanation details so the jury can see what AI is doing.

## Important testing rule

Use Direct Verify API with the uploaded file:

- Original file uploaded by issuer -> Verified
- Any edited/exported/tampered copy -> Tampered

The final decision is made by exact SHA-256 hash matching. AI does not override cryptographic verification.
