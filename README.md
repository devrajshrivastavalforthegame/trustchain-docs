# TrustChain Docs

TrustChain Docs is a Web3 academic credential verification system. It verifies a document by hashing the exact file bytes with SHA-256, storing encrypted documents off-chain, recording hash proof on an EVM-compatible blockchain, and using an AI integrity layer only to explain risk and confidence.

## What is production-hardened in this patched build

- Frontend demo fallback is disabled by default.
- Issuer upload and employer direct verification both support AES-GCM client-side file encryption before upload.
- Backend always decrypts encrypted uploads before hashing, then recomputes SHA-256 from raw bytes.
- Blockchain anchoring no longer creates fake/mock transaction hashes. If chain config is missing, the document is saved with `blockchain_status=pending` and an explicit error.
- Smart contract upload now sends a non-zero `studentIdHash`, matching the current `DocumentVerification.sol` requirement.
- AI output is separated from final verification status. Backend `status` remains `verified`, `tampered`, `pending`, or `rejected`; AI classification appears as `aiStatus`.
- AI provider visibility is shown in the result card: backend fallback, FastAPI rule engine, or Ollama LLM.
- Full PostgreSQL schema and demo-user seed scripts are included.

## Project layout

```txt
client/        React + TypeScript + Vite frontend
server/        Node.js + Express + PostgreSQL backend
ai-service/    FastAPI AI integrity service with optional Ollama
contracts/     Solidity document hash registry
Scripts/       Hardhat deploy script
```

## Local setup

### 1. Database

Create a PostgreSQL database named `trustchain`, then run:

```bash
cd server
npm install
npm run db:schema
npm run db:seed
```

Demo users after seeding:

```txt
issuer@trustchain.local / Password@123
student@trustchain.local / Password@123
employer@trustchain.local / Password@123
developer@trustchain.local / Password@123
```

### 2. Environment keys

The patched ZIP includes local development `.env` files with freshly generated non-production keys so the encrypted wrapper can run immediately. For your own machine, generate new values:

```bash
cd server
npm run keys
```

Copy the server values into `server/.env` and `VITE_API_WRAPPER_KEY` into `client/.env`.

### 3. AI service

```bash
cd ai-service
pip install -r requirements.txt
python -m uvicorn app:app --reload --port 8001
```

Optional Ollama:

```bash
ollama pull llama3.2:1b
ollama serve
```

### 4. Blockchain

Local Hardhat chain:

```bash
npm install
npx hardhat node
```

In another terminal:

```bash
npm run deploy:local
```

Copy the printed `CONTRACT_ADDRESS` into `server/.env`. Use one of the local Hardhat private keys as `BLOCKCHAIN_PRIVATE_KEY`.

Polygon Amoy:

```bash
npm run deploy:amoy
```

For Amoy, set `BLOCKCHAIN_RPC_URL`, `BLOCKCHAIN_PRIVATE_KEY`, and fund the wallet with Amoy POL.

### 5. Backend and frontend

```bash
cd server
npm run dev
```

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`.

## Live demo checklist

1. Login as issuer and upload an original credential file.
2. Confirm the frontend hash and backend hash match.
3. Confirm QR proof and blockchain panel are shown.
4. Login as employer and verify the same file: result should be verified.
5. Edit the file slightly and verify again: result should be tampered.
6. Check the AI panel for score, risk, provider, matched/mismatched signals, and audit trace.
7. Send a student consent request by email.
8. Login as student and approve/reject.
9. Open the QR public verification page.

## Important truth for jury

AI does not decide authenticity. The source of truth is SHA-256 hash comparison plus active credential status and optional blockchain proof. AI translates those cryptographic signals into a readable risk explanation.
