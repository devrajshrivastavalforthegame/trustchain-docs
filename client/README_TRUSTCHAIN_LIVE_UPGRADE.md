# TrustChain Docs — Live API Frontend Upgrade

This upgrade turns the earlier demo UI into an API-first hackathon frontend.

## Backend used by default

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_ENABLE_DEMO_FALLBACK=false
VITE_PUBLIC_APP_URL=http://localhost:5173
VITE_POLLING_INTERVAL_MS=6000
```

## Expected backend routes

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/issuer/upload`
- `POST /api/verification/verify`
- `GET /api/verification/verify?id=<credentialId>`
- `POST /api/verification/request`
- `GET /api/verification/request?email=<email>`
- `PATCH /api/verification/request/:id`
- Optional: `GET /api/developer/stats`

If your backend uses slightly different response keys, the normalizers in `src/services/normalizers.ts` already support common alternatives like `_id`, `txHash`, `transactionHash`, `enrollmentNo`, `documentHash`, `hash`, `data`, `result`, and `payload`.

## Install

```bash
npm install
cp .env.example .env
npm run dev
```

## Real mode vs fallback mode

Real mode:

```env
VITE_ENABLE_DEMO_FALLBACK=false
```

Offline fallback for presentation practice only:

```env
VITE_ENABLE_DEMO_FALLBACK=true
```

## Hackathon flow

1. Issuer logs in and uploads a degree.
2. Frontend generates SHA-256 locally.
3. Frontend sends multipart upload to `/api/issuer/upload`.
4. Backend returns credential + blockchain tx.
5. Student dashboard shows degree + QR.
6. Employer requests verification using enrollment number or hash.
7. Student approves or rejects in the consent popup.
8. Employer screen polls backend and shows VERIFIED or TAMPER DETECTED.
