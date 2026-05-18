# TrustChain Docs Integrated Build

This build merges the critical verification fixes with jury-requested features:

- JWT/RBAC-ready protected issuer routes
- AES-256-GCM encryption helpers for sensitive metadata and uploaded document files
- Google Cloud Storage private bucket upload support with short-lived signed URLs
- QR-ready `/verify/:id` public proof flow and signed download API
- Document Edit/Reissue workflow: old version is preserved as `superseded`, new version gets a new SHA-256 hash and blockchain transaction or explicit pending blockchain status
- File size limit enforced in React upload UI and Express/multer middleware
- Audit log table/helper for sensitive events
- AI gateway route `/api/ai/analyze-document` and bundled `ai-service/` FastAPI service

## Setup

1. Copy `server/.env.example` to `server/.env`.
2. Generate `ENCRYPTION_MASTER_KEY`:
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
3. Run the SQL in `server/db/security-migration.sql` against PostgreSQL.
4. For GCS, create a private bucket and service account with Storage Object Admin. Put the service account JSON outside Git and set `GOOGLE_APPLICATION_CREDENTIALS`.
5. Install dependencies:
   - `cd server && npm install`
   - `cd client && npm install`
6. Run:
   - `cd server && npm run dev`
   - `cd client && npm run dev`

## GCS Notes

Set:
```env
GCS_ENABLED=true
GCS_BUCKET_NAME=your-private-bucket
GCS_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
```

Files are encrypted before upload. The GCS object is private. The API can issue a short-lived signed URL, and the protected download endpoint can decrypt and stream the original file.

## Reissue Flow

Issuer Dashboard -> Recent Uploads -> Edit / Reissue -> Upload corrected document -> submit.
The old row becomes `superseded`; the new row becomes `reissued` and has a new hash.
