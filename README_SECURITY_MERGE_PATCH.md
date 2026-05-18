# TrustChain Docs Security Merge Patch

This build is based on TrustChain-Docs-integrated-with-ai and merges the requested security features:

- Strict SHA-256 raw-file hashing on the frontend before upload/verify.
- Backend verifies the exact raw bytes, including client-encrypted file uploads.
- Student privacy: `/api/issuer/history` returns only documents owned by the logged-in student or uploaded by the logged-in issuer.
- Google One / Google Drive API storage abstraction replacing GCS. Raw Drive IDs/paths are encrypted in DB and not returned to the browser.
- API wrapper encryption for JSON requests: frontend can send encrypted envelopes to `/api/wrapped`.
- Optional encrypted API responses.
- 10 MB frontend and backend file-size limits.
- Issuer reissue flow: old document is superseded and new hash/version is registered.
- AI service preserved under `ai-service/` and `/api/ai` routes.

## Enable API wrapper encryption

Generate a key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Server `.env`:

```env
API_WRAPPER_KEY=<same-generated-key>
API_RESPONSE_ENCRYPTION=true
```

Client `.env`:

```env
VITE_API_WRAPPER_ENCRYPTION=true
VITE_API_WRAPPER_KEY=<same-generated-key>
```

## Google Drive / Google One mode

```env
GOOGLE_DRIVE_ENABLED=true
GOOGLE_APPLICATION_CREDENTIALS=C:/absolute/path/to/google-service-account.json
GOOGLE_DRIVE_FOLDER_ID=<folder-id-shared-with-service-account>
```

For local demo, keep:

```env
GOOGLE_DRIVE_ENABLED=false
GCS_ENABLED=false
```

## Run

```bash
cd server
npm install
npm run dev

cd ../client
npm install
npm run dev

cd ../ai-service
pip install -r requirements.txt
uvicorn app:app --reload --port 8001
```
