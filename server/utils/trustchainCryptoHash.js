"use strict";

const crypto = require("crypto");
const fs = require("fs");

function toBuffer(input) {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof ArrayBuffer) return Buffer.from(input);
  if (ArrayBuffer.isView(input)) return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  if (typeof input === "string") return Buffer.from(input, "utf8");
  throw new TypeError("Input must be a Buffer, ArrayBuffer, typed array, or string.");
}

function hashBuffer(input) {
  return crypto.createHash("sha256").update(toBuffer(input)).digest("hex");
}

function hashString(input) {
  return hashBuffer(String(input || ""));
}

function hashFile(fileOrPath) {
  if (!fileOrPath) throw new TypeError("fileOrPath is required.");

  if (typeof fileOrPath === "string") {
    return crypto.createHash("sha256").update(fs.readFileSync(fileOrPath)).digest("hex");
  }

  if (fileOrPath.buffer) return hashBuffer(fileOrPath.buffer);
  if (fileOrPath.path) return hashFile(fileOrPath.path);

  return hashBuffer(fileOrPath);
}

function normalizeHash(hash) {
  const normalized = String(hash || "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error("documentHash must be a valid SHA-256 hex digest.");
  }
  return normalized;
}

function getHmacSecret({ required = false } = {}) {
  const secret = String(
    process.env.DOCUMENT_HMAC_SECRET ||
      process.env.ISSUER_HMAC_SECRET ||
      process.env.LOOKUP_HASH_SECRET ||
      process.env.ISSUER_PRIVATE_KEY ||
      ""
  ).trim();

  if (!secret && required) {
    throw new Error("DOCUMENT_HMAC_SECRET or another HMAC secret must be configured.");
  }

  return secret || null;
}

function signHash(documentHash, metadata = {}) {
  const secret = getHmacSecret({ required: true });
  const payload = JSON.stringify({
    documentHash: normalizeHash(documentHash),
    metadata,
    issuedAt: metadata.issuedAt || new Date().toISOString()
  });

  const signature = crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");

  return {
    algorithm: "HMAC-SHA256",
    payload,
    signature
  };
}

function timingSafeHexEqual(expectedHex, receivedHex) {
  const expected = Buffer.from(String(expectedHex || ""), "hex");
  const received = Buffer.from(String(receivedHex || ""), "hex");

  if (expected.length !== received.length || expected.length === 0) {
    const dummy = crypto.randomBytes(32);
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }

  return crypto.timingSafeEqual(expected, received);
}

function verifyHashSignature(payload, signature) {
  try {
    const secret = getHmacSecret({ required: true });
    const canonicalPayload = typeof payload === "string" ? payload : JSON.stringify(payload);
    const expected = crypto.createHmac("sha256", secret).update(canonicalPayload, "utf8").digest("hex");
    const valid = timingSafeHexEqual(expected, signature);

    return {
      valid,
      algorithm: "HMAC-SHA256",
      reason: valid ? "Signature is valid." : "Signature mismatch."
    };
  } catch (error) {
    return {
      valid: false,
      algorithm: "HMAC-SHA256",
      reason: error.message || "Signature verification failed."
    };
  }
}

function signHashIfConfigured(documentHash, metadata = {}) {
  if (!getHmacSecret()) return null;
  return signHash(documentHash, metadata);
}

module.exports = {
  hashBuffer,
  hashFile,
  hashString,
  signHash,
  verifyHashSignature,
  signHashIfConfigured,
  normalizeHash,
  // Backward-compatible aliases from the smaller crypto-hash patch.
  calculateRawFileHash: hashBuffer,
  generateIssuerSignature: (documentHash, studentEmail, version) =>
    signHash(documentHash, { studentEmail, version }),
  verifyIssuerSignature: verifyHashSignature
};
