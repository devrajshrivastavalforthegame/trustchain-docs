const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";

function getApiKey() {
  const raw = process.env.API_WRAPPER_KEY || process.env.API_ENCRYPTION_KEY || process.env.ENCRYPTION_MASTER_KEY;
  if (!raw || raw.includes("replace-with")) {
    if (String(process.env.ALLOW_INSECURE_DEMO_KEYS || "false").toLowerCase() === "true") {
      console.warn("Using insecure demo API wrapper key. Never use this in production.");
      return crypto.createHash("sha256").update("trustchain-demo-api-wrapper-key").digest();
    }
    throw new Error("API_WRAPPER_KEY is missing. Generate a 32-byte base64 key with: npm run keys");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("API_WRAPPER_KEY must be 32-byte base64");
  return key;
}

function encryptJson(data) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getApiKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  return {
    encrypted: true,
    algorithm: ALGORITHM,
    payload: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

function decryptJson(envelope) {
  if (!envelope || envelope.encrypted !== true) throw new Error("Encrypted envelope required");
  const decipher = crypto.createDecipheriv(ALGORITHM, getApiKey(), Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.payload, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext);
}

function decryptClientFile(buffer, metadata) {
  const parsed = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
  const decipher = crypto.createDecipheriv(ALGORITHM, getApiKey(), Buffer.from(parsed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(parsed.authTag, "base64"));
  return Buffer.concat([decipher.update(buffer), decipher.final()]);
}

module.exports = { encryptJson, decryptJson, decryptClientFile };
