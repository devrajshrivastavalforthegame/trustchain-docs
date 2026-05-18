const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { encryptText, decryptText } = require("./cryptoService");

const driveEnabled = () => String(process.env.GOOGLE_DRIVE_ENABLED || "false").toLowerCase() === "true";
const driveFolderId = () => process.env.GOOGLE_DRIVE_FOLDER_ID || undefined;

function safeName(name = "document.bin") {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getDriveClient() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is required when GOOGLE_DRIVE_ENABLED=true");
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  return google.drive({ version: "v3", auth });
}

async function uploadEncryptedObject({ buffer, originalName, contentType, hash }) {
  const objectName = `trustchain-docs/${new Date().toISOString().slice(0, 10)}/${Date.now()}_${hash.slice(0, 12)}_${safeName(originalName)}.enc`;

  if (driveEnabled()) {
    const drive = getDriveClient();
    const tempDir = path.join(process.cwd(), "uploads", "tmp-drive");
    fs.mkdirSync(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, path.basename(objectName));
    fs.writeFileSync(tempPath, buffer);

    try {
      const response = await drive.files.create({
        requestBody: {
          name: path.basename(objectName),
          parents: driveFolderId() ? [driveFolderId()] : undefined,
          appProperties: {
            originalName: originalName || "document",
            originalContentType: contentType || "application/octet-stream",
            sha256: hash,
            encrypted: "true",
            trustchainObjectName: objectName,
          },
        },
        media: {
          mimeType: "application/octet-stream",
          body: fs.createReadStream(tempPath),
        },
        fields: "id,name,webViewLink,webContentLink",
      });

      return {
        provider: "google-drive",
        bucket: "google-one-drive",
        objectName: encryptText(JSON.stringify({ driveFileId: response.data.id, objectName })),
        driveFileId: response.data.id,
      };
    } finally {
      fs.rmSync(tempPath, { force: true });
    }
  }

  const localDir = path.join(process.cwd(), "uploads", "encrypted");
  fs.mkdirSync(localDir, { recursive: true });
  const localPath = path.join(localDir, path.basename(objectName));
  fs.writeFileSync(localPath, buffer);
  return {
    provider: "local-private",
    bucket: "local",
    objectName: encryptText(JSON.stringify({ localPath, objectName })),
  };
}

function decryptLocationObjectName(encryptedObjectName) {
  if (!encryptedObjectName) throw new Error("Missing encrypted storage object name");
  try {
    return JSON.parse(decryptText(encryptedObjectName));
  } catch (error) {
    // Backward compatibility for older rows that stored raw local paths.
    return { localPath: encryptedObjectName, objectName: encryptedObjectName };
  }
}

async function readEncryptedObject(location) {
  const storageMeta = decryptLocationObjectName(location.objectName);
  if (location.provider === "google-drive") {
    const drive = getDriveClient();
    const response = await drive.files.get(
      { fileId: storageMeta.driveFileId || location.driveFileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
    return Buffer.from(response.data);
  }
  return fs.readFileSync(storageMeta.localPath || storageMeta.objectName);
}

async function createSignedUrl(location, minutes = Number(process.env.GOOGLE_DRIVE_LINK_EXPIRES_MINUTES || 15)) {
  const storageMeta = decryptLocationObjectName(location.objectName);
  if (location.provider === "google-drive") {
    // Google Drive does not have native short-lived signed URLs like GCS.
    // We return a backend-controlled temporary route instead of exposing the raw Drive file id/path.
    const tokenPayload = encryptText(JSON.stringify({
      provider: "google-drive",
      driveFileId: storageMeta.driveFileId || location.driveFileId,
      exp: Date.now() + minutes * 60 * 1000,
    }));
    return `/api/issuer/drive-download?token=${encodeURIComponent(tokenPayload)}`;
  }
  return "";
}

module.exports = { uploadEncryptedObject, readEncryptedObject, createSignedUrl, decryptLocationObjectName };
