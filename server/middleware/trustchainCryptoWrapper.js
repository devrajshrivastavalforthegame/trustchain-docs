"use strict";

const crypto = require("crypto");

const ENVELOPE_VERSION = "trustchain-aes-256-gcm-v1";
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;

function isApiEncryptionEnabled() {
  return String(process.env.API_RESPONSE_ENCRYPTION || "false").toLowerCase() === "true";
}

function isMultipartRequest(req) {
  return String(req.headers["content-type"] || "").toLowerCase().includes("multipart/form-data");
}

function decodeKey() {
  const rawKey = String(process.env.API_WRAPPER_KEY || "").trim();
  if (!rawKey) return null;

  if (/^[a-fA-F0-9]{64}$/.test(rawKey)) {
    const key = Buffer.from(rawKey, "hex");
    if (key.length === 32) return key;
  }

  try {
    const key = Buffer.from(rawKey, "base64");
    if (key.length === 32) return key;
  } catch (_) {
    // ignore
  }

  const utf8 = Buffer.from(rawKey, "utf8");
  return utf8.length === 32 ? utf8 : null;
}

function assertEnvelope(envelope) {
  return Boolean(
    envelope &&
      typeof envelope === "object" &&
      envelope.encrypted === true &&
      typeof envelope.payload === "string" &&
      typeof envelope.iv === "string" &&
      typeof envelope.authTag === "string"
  );
}

function encryptJson(data) {
  const key = decodeKey();
  if (!key) throw new Error("API_WRAPPER_KEY must be a 32-byte base64, hex, or UTF-8 key.");

  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, { authTagLength: AUTH_TAG_LENGTH_BYTES });
  const plaintext = Buffer.from(JSON.stringify(data === undefined ? null : data), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted: true,
    version: ENVELOPE_VERSION,
    algorithm: "aes-256-gcm",
    payload: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64")
  };
}

function decryptJson(envelope) {
  if (!assertEnvelope(envelope)) throw new Error("Invalid encrypted API envelope.");

  const key = decodeKey();
  if (!key) throw new Error("API_WRAPPER_KEY must be a 32-byte base64, hex, or UTF-8 key.");

  const iv = Buffer.from(envelope.iv, "base64");
  const authTag = Buffer.from(envelope.authTag, "base64");
  const ciphertext = Buffer.from(envelope.payload, "base64");

  if (iv.length !== IV_LENGTH_BYTES) throw new Error("Invalid IV length.");
  if (authTag.length !== AUTH_TAG_LENGTH_BYTES) throw new Error("Invalid authentication tag length.");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, { authTagLength: AUTH_TAG_LENGTH_BYTES });
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext);
}

function shouldEncryptResponse(req, body) {
  if (!isApiEncryptionEnabled()) return false;
  if (req.path === "/api/health" || req.path === "/api/security/health") return false;
  if (body && typeof body === "object" && body.encrypted === true) return false;
  return true;
}

function trustchainCryptoWrapper(req, res, next) {
  if (!isApiEncryptionEnabled() || isMultipartRequest(req)) return next();

  const originalJson = res.json.bind(res);

  res.json = function encryptedJsonResponse(body) {
    if (!shouldEncryptResponse(req, body)) return originalJson(body);

    try {
      return originalJson(encryptJson(body));
    } catch (error) {
      console.error("TrustChain API encryption failed:", error.message);
      res.statusCode = res.statusCode >= 400 ? res.statusCode : 500;
      return originalJson({
        success: false,
        code: "API_RESPONSE_ENCRYPTION_FAILED",
        message: "Encrypted API response could not be created."
      });
    }
  };

  try {
    if (assertEnvelope(req.body)) {
      req.body = decryptJson(req.body);
      req.encryptedApiRequest = true;
    }
    return next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      code: "API_REQUEST_DECRYPTION_FAILED",
      message: "Encrypted API request could not be decrypted or authenticated."
    });
  }
}

module.exports = {
  trustchainCryptoWrapper,
  encryptJson,
  decryptJson,
  isApiEncryptionEnabled
};
