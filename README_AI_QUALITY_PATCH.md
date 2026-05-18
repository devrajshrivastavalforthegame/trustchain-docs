# TrustChain Docs AI Integrity Quality Patch

Extract this ZIP into your existing `TrustChain-Docss` project root and choose **Replace files**.

## What this patch fixes

1. Removes the hardcoded AI score behavior where tampered was always 9% and verified was always 98%.
2. Backend now calls the AI service at `AI_SERVICE_URL=/analyze-document` when `USE_AI=true`.
3. If the AI service or Ollama is unavailable, backend falls back to dynamic rule-based AI scoring instead of fixed scores.
4. Employer verification results now include:
   - AI Integrity Score
   - Risk level
   - AI summary
   - Employer-facing explanation
   - Matched signals
   - Mismatched signals
   - Risk factors
   - AI audit output
5. Direct verify now sends `studentEmail` and file/hash context to backend so AI has more context.

## Files replaced

- `ai-service/app.py`
- `server/controllers/userController.js`
- `server/routes/verificationRoutes.js`
- `client/src/components/VerificationCard.tsx`
- `client/src/types/domain.ts`
- `client/src/services/normalizers.ts`
- `client/src/services/verificationService.ts`
- `client/src/pages/EmployerVerify.tsx`
- `client/src/services/fallbackStore.ts`

## Required env values

Server `.env`:

```env
USE_AI=true
AI_SERVICE_URL=http://localhost:8001
OLLAMA_MODEL=llama3.2:1b
OLLAMA_URL=http://localhost:11434/api/generate
```

AI service uses `OLLAMA_MODEL`, `OLLAMA_URL`, and optional:

```env
USE_OLLAMA=true
```

If Ollama is not running, the AI service still returns a deterministic fallback explanation.

## Restart after applying

```powershell
# AI service
cd ai-service
.\venv\Scripts\Activate.ps1
python -m uvicorn app:app --reload --port 8001

# Backend
cd server
npm run dev

# Frontend
cd client
npm run dev
```

## What to expect

Verified documents should show a variable high score such as 92–99 and a low-risk explanation.
Tampered documents should show a variable low score such as 10–34 and a high-risk explanation.
The AI score is explanatory only; SHA-256 hash match remains the final proof.
