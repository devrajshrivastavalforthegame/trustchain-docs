
const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";

function getMasterKey() {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key || key.includes("replace-with")) {
    if (String(process.env.ALLOW_INSECURE_DEMO_KEYS || "false").toLowerCase() === "true") {
      console.warn("Using insecure demo storage encryption key. Never use this in production.");
      return crypto.createHash("sha256").update("trustchain-demo-local-key").digest();
    }
    throw new Error("ENCRYPTION_MASTER_KEY is missing. Generate a 32-byte base64 key with: npm run keys");
  }
  const buffer = Buffer.from(key, "base64");
  if (buffer.length !== 32) {
    throw new Error("ENCRYPTION_MASTER_KEY must be a 32-byte base64 value.");
  }
  return buffer;
}

function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext,
    metadata: {
      algorithm: ALGORITHM,
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
      keyId: process.env.ENCRYPTION_KEY_ID || "local-key-v1",
    },
  };
}

function decryptBuffer(ciphertext, metadata) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getMasterKey(),
    Buffer.from(metadata.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(metadata.authTag, "base64"));
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function encryptText(value) {
  if (value === null || value === undefined || value === "") return null;
  const { ciphertext, metadata } = encryptBuffer(Buffer.from(String(value), "utf8"));
  return JSON.stringify({ ...metadata, ciphertext: ciphertext.toString("base64") });
}

function decryptText(value) {
  if (!value) return null;
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  return decryptBuffer(Buffer.from(parsed.ciphertext, "base64"), parsed).toString("utf8");
}

function createLookupHash(value) {
  const secret = process.env.LOOKUP_HASH_SECRET || process.env.JWT_SECRET || "trustchain-demo-lookup";
  return crypto.createHmac("sha256", secret).update(String(value || "").trim().toLowerCase()).digest("hex");
}

module.exports = { encryptBuffer, decryptBuffer, encryptText, decryptText, createLookupHash };
