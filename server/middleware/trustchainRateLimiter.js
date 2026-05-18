"use strict";

const rateLimitModule = require("express-rate-limit");
const rateLimit = rateLimitModule.rateLimit || rateLimitModule;

function isProduction() {
  return String(process.env.NODE_ENV || "").toLowerCase() === "production";
}

function readNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function skipSafeRequests(req) {
  if (req.method === "OPTIONS") return true;
  if (["/", "/api/health", "/health", "/api/security/health", "/api/ai/health"].includes(req.path)) return true;
  return false;
}

function buildRateLimitHandler(code, message) {
  return function rateLimitHandler(req, res) {
    const reset = req.rateLimit && req.rateLimit.resetTime;
    const retryAfterSeconds = reset instanceof Date
      ? Math.ceil(Math.max(reset.getTime() - Date.now(), 0) / 1000)
      : undefined;

    return res.status(429).json({
      success: false,
      code,
      message,
      retryAfterSeconds
    });
  };
}

function createLimiter({ windowMs, max, envName, code, message, skip = skipSafeRequests }) {
  return rateLimit({
    windowMs,
    max: readNumber(envName, max),
    standardHeaders: true,
    legacyHeaders: false,
    handler: buildRateLimitHandler(code, message),
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    skip
  });
}

const generalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProduction() ? 300 : 600,
  envName: "RATE_LIMIT_GENERAL_MAX",
  code: "GENERAL_RATE_LIMITED",
  message: "Too many API requests. Please slow down and try again."
});

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProduction() ? 30 : 200,
  envName: "RATE_LIMIT_AUTH_MAX",
  code: "AUTH_RATE_LIMITED",
  message: "Too many authentication attempts. Please wait before trying again.",
  skip: (req) => req.method === "OPTIONS"
});

const uploadLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProduction() ? 50 : 100,
  envName: "RATE_LIMIT_UPLOAD_MAX",
  code: "UPLOAD_RATE_LIMITED",
  message: "Too many upload submissions. Please wait before uploading again."
});

const verificationLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: isProduction() ? 120 : 200,
  envName: "RATE_LIMIT_VERIFICATION_MAX",
  code: "VERIFICATION_RATE_LIMITED",
  message: "Too many verification lookups. Please slow down and try again shortly."
});

const aiLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: isProduction() ? 60 : 100,
  envName: "RATE_LIMIT_AI_MAX",
  code: "AI_RATE_LIMITED",
  message: "Too many AI requests. Please wait before requesting more analysis."
});

module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  verificationLimiter,
  aiLimiter,
  buildRateLimitHandler
};
