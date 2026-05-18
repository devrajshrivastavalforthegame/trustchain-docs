"use strict";

const express = require("express");
const {
  hashString,
  hashBuffer,
  signHashIfConfigured,
  verifyHashSignature
} = require("../utils/trustchainCryptoHash");

const router = express.Router();

function flag(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

router.get("/health", (_req, res) => {
  res.json({
    success: true,
    service: "TrustChain safe security patch",
    features: {
      secureCors: flag("ENABLE_SECURE_CORS", true),
      rateLimit: flag("ENABLE_RATE_LIMIT", true),
      cryptoHash: flag("ENABLE_CRYPTO_HASH", true),
      apiResponseEncryption: flag("API_RESPONSE_ENCRYPTION", false),
      dynamicRbac: flag("ENABLE_RBAC", false)
    }
  });
});

router.post("/hash-demo", express.json({ limit: "1mb" }), (req, res) => {
  if (!flag("ENABLE_CRYPTO_HASH", true)) {
    return res.status(403).json({
      success: false,
      message: "Crypto hash feature is disabled. Set ENABLE_CRYPTO_HASH=true."
    });
  }

  const text = String(req.body && (req.body.text || req.body.value || req.body.document || "TrustChain Docs"));
  const documentHash = hashString(text);
  const signature = signHashIfConfigured(documentHash, { source: "security-demo", textLength: text.length });

  return res.json({
    success: true,
    algorithm: "SHA-256",
    documentHash,
    signed: Boolean(signature),
    signature
  });
});

router.post("/verify-signature", express.json({ limit: "1mb" }), (req, res) => {
  const { payload, signature } = req.body || {};
  return res.json({ success: true, ...verifyHashSignature(payload, signature) });
});

module.exports = router;
