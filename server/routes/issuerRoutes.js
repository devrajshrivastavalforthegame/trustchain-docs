
const express = require("express");
const pool = require("../config/db");
const { upload, handleMulterError } = require("../middleware/uploadLimit");
const { requireAuth, requireRole } = require("../middleware/secureAuth");
const { uploadDocument, reissueDocument, downloadDocument, createDocumentSignedUrl, downloadDriveToken } = require("../controllers/issuerController");

const router = express.Router();

router.post("/upload", requireAuth, requireRole("issuer", "developer"), upload.any(), handleMulterError, uploadDocument);
router.post("/reissue/:documentId", requireAuth, requireRole("issuer", "developer"), upload.any(), handleMulterError, reissueDocument);
router.get("/documents/:documentId/download", requireAuth, requireRole("issuer", "student", "developer"), downloadDocument);
router.get("/documents/:documentId/signed-url", requireAuth, requireRole("issuer", "student", "developer"), createDocumentSignedUrl);
router.get("/drive-download", downloadDriveToken);

router.get("/history", requireAuth, requireRole("issuer", "student", "developer", "admin"), async (req, res) => {
  try {
    const params = [];
    let where = "";

    if (req.user.role === "student") {
      params.push(String(req.user.email || "").trim().toLowerCase());
      where = "WHERE LOWER(COALESCE(students.email,'')) = $1";
    } else if (req.user.role === "issuer") {
      params.push(req.user.id);
      where = "WHERE documents.uploaded_by = $1";
    } else if (req.query.studentEmail) {
      params.push(String(req.query.studentEmail).trim().toLowerCase());
      where = "WHERE LOWER(COALESCE(students.email,'')) = $1";
    }

    const result = await pool.query(`
      SELECT
        documents.id,
        documents.file_hash AS "documentHash",
        documents.file_hash AS "fileHash",
        documents.polygon_tx AS "txHash",
        documents.polygon_tx AS "transactionHash",
        documents.created_at AS "createdAt",
        documents.version,
        documents.status,
        documents.previous_document_id AS "previousDocumentId",
        documents.reissue_reason AS "reissueReason",
        documents.gcs_provider AS "storageProvider",
        documents.gcs_bucket AS "storageBucket",
        NULL AS "encryptedStoragePath",
        documents.tampered,
        students.student_name AS "studentName",
        students.email AS "studentEmail",
        students.enrollment_no AS "enrollmentNumber",
        students.roll_no AS "rollNumber",
        students.course AS "course"
      FROM documents
      JOIN students ON documents.student_id = students.id
      ${where}
      ORDER BY documents.created_at DESC
    `, params);
    return res.json({ success: true, history: result.rows });
  } catch (error) {
    console.log("HISTORY ERROR:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
