# TrustChain Docs

TrustChain Docs verifies academic credentials without storing the document itself on a blockchain.

## How verification works

1. An issuer uploads a credential.
2. The server encrypts its stored copy and calculates a SHA-256 fingerprint from the original file bytes.
3. The fingerprint and credential status are saved in PostgreSQL. A proof can also be recorded through the Solidity contract.
4. A verifier uploads the file again. An exact fingerprint match with an active credential is **verified**; a different fingerprint is **tampered**.
5. The AI service explains the supporting signals and risk. It never overrides the hash result.

## Project structure

```text
client/       React, TypeScript, Vite user interface
server/       Express API, PostgreSQL, authentication and verification logic
ai-service/   FastAPI risk explanation service; Ollama is optional
contracts/    Solidity document-hash registry
Scripts/      Hardhat deployment script
```

## Main user journeys

- **Issuer:** creates and issues credentials.
- **Student:** receives and approves or rejects verification requests.
- **Employer:** submits a credential for verification.
- **Administrator:** approves sensitive account registrations.
- **Public verifier:** checks a credential through a QR/public verification link.

## Run locally

### 1. Database and API

Create a PostgreSQL database named `trustchain`, then run:

```bash
cd server
npm install
npm run db:schema
npm run db:seed
npm run keys
npm run dev
```

Create `server/.env` with the generated server keys and database settings. Create `client/.env` with `VITE_API_WRAPPER_KEY`.

### 2. AI service (optional)

```bash
cd ai-service
pip install -r requirements.txt
python -m uvicorn app:app --reload --port 8001
```

Ollama can be enabled separately if a local language-model explanation is wanted.

### 3. Client

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`.

### 4. Blockchain (optional)

```bash
npm install
npx hardhat node
```

In a second terminal:

```bash
npm run deploy:local
```

Copy the printed contract address and a local private key into `server/.env`.

## Demo accounts

Run `npm run db:seed` in `server/`, then use `Password@123` with one of:

- `issuer@trustchain.local`
- `student@trustchain.local`
- `employer@trustchain.local`
- `developer@trustchain.local`
