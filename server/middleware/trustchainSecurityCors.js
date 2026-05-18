"use strict";

const cors = require("cors");

const DEFAULT_DEV_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "http://localhost:5174",
  "http://127.0.0.1:5174"
];

function isProduction() {
  return String(process.env.NODE_ENV || "").toLowerCase() === "production";
}

function normalizeOrigin(origin) {
  try {
    return new URL(String(origin || "").trim()).origin;
  } catch (_) {
    return null;
  }
}

function splitOrigins(value) {
  return String(value || "")
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
}

function getAllowedOrigins() {
  const origins = new Set([
    ...splitOrigins(process.env.CLIENT_ORIGIN),
    ...splitOrigins(process.env.CLIENT_URL),
    ...splitOrigins(process.env.ALLOWED_ORIGINS)
  ]);

  if (!isProduction()) {
    DEFAULT_DEV_ORIGINS.forEach((origin) => origins.add(origin));
  }

  return origins;
}

function createCorsOptions() {
  return {
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Authorization",
      "Content-Type",
      "Accept",
      "Origin",
      "X-Requested-With",
      "X-CSRF-Token",
      "X-API-Encryption",
      "x-api-encryption",
      "x-refresh-intent"
    ],
    exposedHeaders: [
      "RateLimit-Limit",
      "RateLimit-Remaining",
      "RateLimit-Reset",
      "Retry-After"
    ],
    optionsSuccessStatus: 204,
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const normalizedOrigin = normalizeOrigin(origin);
      const allowedOrigins = getAllowedOrigins();

      if (normalizedOrigin && allowedOrigins.has(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by TrustChain CORS policy.`), false);
    }
  };
}

const trustchainSecurityCors = cors(createCorsOptions());

module.exports = trustchainSecurityCors;
module.exports.trustchainSecurityCors = trustchainSecurityCors;
module.exports.createCorsOptions = createCorsOptions;
module.exports.getAllowedOrigins = getAllowedOrigins;
