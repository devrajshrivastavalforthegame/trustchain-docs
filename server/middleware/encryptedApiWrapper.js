const express = require("express");
const { decryptJson, encryptJson } = require("../services/apiWrapperCrypto");

function isPlainHealthCheck(req) {
  return req.path === "/api/health" || req.path === "/api/ai/health" || req.path === "/health";
}

function encryptedResponse(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    const shouldEncrypt =
      String(process.env.API_RESPONSE_ENCRYPTION || "false").toLowerCase() === "true" ||
      String(req.headers["x-api-response-encryption"] || "").toLowerCase() === "true";

    if (isPlainHealthCheck(req) || !shouldEncrypt || data?.encrypted === true) return originalJson(data);
    try {
      return originalJson(encryptJson(data));
    } catch (error) {
      console.error("Encrypted response failed:", error.message);
      return originalJson({ success: false, message: "Encrypted response failed" });
    }
  };
  next();
}

function createEncryptedApiWrapper(app) {
  const router = express.Router();
  router.post("/wrapped", async (req, res) => {
    try {
      const request = decryptJson(req.body);
      const method = String(request.method || "GET").toUpperCase();
      const path = String(request.path || "");

      if (!path.startsWith("/") || path.includes("..") || path.startsWith("/wrapped")) {
        return res.status(400).json(encryptJson({ success: false, message: "Invalid wrapped path" }));
      }
      if (!["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) {
        return res.status(405).json(encryptJson({ success: false, message: "Invalid wrapped method" }));
      }

      req.url = `/api${path}`;
      req.method = method;
      req.body = request.body || {};
      req.headers["x-api-response-encryption"] = "true";
      return app.handle(req, res);
    } catch (error) {
      return res.status(400).json(encryptJson({ success: false, message: "Invalid encrypted API wrapper payload", error: error.message }));
    }
  });
  return router;
}

module.exports = { encryptedResponse, createEncryptedApiWrapper };
