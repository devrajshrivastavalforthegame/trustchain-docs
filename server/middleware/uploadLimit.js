
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const maxUploadMB = Number(process.env.MAX_UPLOAD_MB || 10);
const maxUploadBytes = maxUploadMB * 1024 * 1024;
const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`),
});

const upload = multer({
  storage,
  limits: { fileSize: maxUploadBytes, files: 5 },
});

function handleMulterError(err, _req, res, next) {
  if (!err) return next();
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ success: false, message: `File too large. Maximum upload size is ${maxUploadMB}MB.` });
  }
  return res.status(400).json({ success: false, message: err.message || "File upload failed" });
}

module.exports = { upload, handleMulterError, maxUploadMB, maxUploadBytes };
