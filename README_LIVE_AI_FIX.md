# TrustChain Docs — Live AI Fix Build

This build keeps the email-based verification request flow and tamper-proof SHA-256 verification, then fixes AI so employer results use the live AI service when it is reachable.

## What changed

- Added `server/services/aiIntegrityService.js` as one shared AI integration layer.
- Updated `server/routes/verificationRoutes.js` so student approval/status results call the live AI service instead of always using static fallback text.
- Updated `server/controllers/userController.js` so direct upload/hash verification uses the same shared AI integration layer.
- Updated `ai-service/app.py` with better variable scoring, employer-facing explanations, risk factors, and AI audit output.
- Updated the frontend normalizer/types/card so the UI shows whether the result came from the live AI service or backend fallback.

## Important

If the UI says `Backend fallback AI`, the FastAPI service is not reachable from the Node backend. Start it from the correct folder:

```powershell
cd D:\TrustChain-Docs\TrustChain-Docss\ai-service
D:\TrustChain-Docs\.venv\Scripts\Activate.ps1
python -m uvicorn app:app --reload --port 8001
```

Then check:

```txt
http://localhost:8001
http://localhost:5000/api/ai/health
```

`/api/ai/health` should show `reachable: true`.

## Backend env

```env
USE_AI=true
AI_SERVICE_URL=http://localhost:8001
OLLAMA_MODEL=llama3.2:1b
OLLAMA_URL=http://localhost:11434/api/generate
```

If Ollama is not running, the FastAPI AI service still returns a live rule-based explanation. It will show `fastapi-rule-engine` instead of `ollama`.
