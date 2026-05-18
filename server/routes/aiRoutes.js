const express = require("express");
const { analyzeWithAiService, localAiAnalysis } = require("../services/aiIntegrityService");

const router = express.Router();

const aiEnabled = () => String(process.env.USE_AI || "false").toLowerCase() === "true";
const aiServiceUrl = () => process.env.AI_SERVICE_URL || "http://localhost:8001";

router.get("/health", async (_req, res) => {
  const payload = {
    success: true,
    enabled: aiEnabled(),
    service: "TrustChain AI gateway",
    aiServiceUrl: aiServiceUrl(),
    reachable: false,
  };

  if (!aiEnabled() || typeof fetch !== "function") {
    return res.json(payload);
  }

  try {
    const response = await fetch(`${aiServiceUrl().replace(/\/$/, "")}/`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error(`AI service returned ${response.status}`);
    const data = await response.json();
    return res.json({ ...payload, reachable: true, aiService: data });
  } catch (error) {
    return res.json({ ...payload, reachable: false, warning: error.message });
  }
});

router.post("/analyze-document", async (req, res) => {
  if (!aiEnabled()) {
    return res.json({ success: true, ai: localAiAnalysis(req.body), mode: "backend-fallback-ai-disabled" });
  }

  const ai = await analyzeWithAiService(req.body);
  return res.json({
    success: true,
    ai,
    mode: ai.aiServiceConnected ? "ai-service" : "backend-fallback",
  });
});

module.exports = router;
