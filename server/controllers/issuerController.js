
const fs = require("fs");
const pool = require("../config/db");
const generateFileHash = require("../services/hashService");
const { storeHashOnBlockchain, reissueHashOnBlockchain } = require("../services/polygonService");
const { encryptText, decryptText, encryptBuffer, decryptBuffer, createLookupHash } = require("../services/cryptoService");
const { uploadEncryptedObject, readEncryptedObject, createSignedUrl } = require("../services/gcsService");
const { audit } = require("../services/auditService");
const { decryptClientFile } = require("../services/apiWrapperCrypto");
const crypto = require("crypto");

async function ensureSecurityColumns() {
  await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS student_name_enc TEXT`);
  await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS email_enc TEXT`);
  await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_no_enc TEXT`);
  await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS roll_no_enc TEXT`);
  await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_no_lookup_hash TEXT`);
  await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1`);
  await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS previous_document_id INTEGER`);
  await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'`);
  await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS reissue_reason TEXT`);
  await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS gcs_provider TEXT`);
  await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS gcs_bucket TEXT`);
  await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS gcs_object_name TEXT`);
  await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS encryption_metadata JSONB`);
  await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS original_file_name TEXT`);
  await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type TEXT`);
  await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS blockchain_status TEXT DEFAULT 'pending'`);
  await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS blockchain_error TEXT`);
  await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS block_number TEXT`);
  await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS degree_title TEXT`);
  await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS department TEXT`);
  await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS graduation_year TEXT`);
  await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS university TEXT DEFAULT 'Oriental University'`);
}

function safeDecrypt(value, fallback) {
  try { return value ? decryptText(value) : fallback; } catch { return fallback; }
}

async function upsertStudent({ studentName, studentEmail, enrollmentNumber, rollNumber, course }) {
  const lookupHash = createLookupHash(enrollmentNumber);
  let result = await pool.query(
    `SELECT * FROM students WHERE enrollment_no_lookup_hash=$1 OR (enrollment_no=$2 AND roll_no=$3) LIMIT 1`,
    [lookupHash, enrollmentNumber, rollNumber]
  );
  if (result.rows.length) return result.rows[0];

  const created = await pool.query(
    `INSERT INTO students(student_name, email, enrollment_no, roll_no, course, student_name_enc, email_enc, enrollment_no_enc, roll_no_enc, enrollment_no_lookup_hash)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      studentName,
      studentEmail || "",
      enrollmentNumber,
      rollNumber,
      course || "Unknown",
      encryptText(studentName),
      encryptText(studentEmail || ""),
      encryptText(enrollmentNumber),
      encryptText(rollNumber),
      lookupHash,
    ]
  );
  return created.rows[0];
}

function buildCredential(row, student, extras = {}) {
  const studentName = safeDecrypt(student.student_name_enc, student.student_name || extras.studentName || "Student");
  const enrollmentNumber = safeDecrypt(student.enrollment_no_enc, student.enrollment_no || extras.enrollmentNumber || "");
  const rollNumber = safeDecrypt(student.roll_no_enc, student.roll_no || extras.rollNumber || "");
  const studentEmail = safeDecrypt(student.email_enc, extras.studentEmail || "alex.jain@student.edu");
  return {
    id: String(row.id),
    documentId: String(row.id),
    previousDocumentId: row.previous_document_id ? String(row.previous_document_id) : "",
    version: row.version || extras.version || 1,
    studentName,
    studentEmail,
    enrollmentNumber,
    rollNumber,
    degreeTitle: extras.degreeTitle || row.degree_title || "Bachelor of Technology",
    course: student.course || extras.course || "Computer Science and Engineering",
    department: extras.department || "Computer Science",
    university: extras.university || "Oriental University",
    graduationYear: extras.graduationYear || "2026",
    documentHash: row.file_hash,
    fileHash: row.file_hash,
    txHash: row.polygon_tx || extras.txHash || "",
    transactionHash: row.polygon_tx || extras.txHash || "",
    blockNumber: row.block_number || extras.blockNumber || "",
    gasUsed: extras.gasUsed || "",
    network: extras.network || row.blockchain_network || "Polygon Amoy / Local EVM",
    blockchainStatus: row.blockchain_status || extras.blockchainStatus || "pending",
    blockchainError: row.blockchain_error || extras.blockchainError || "",
    status: row.status || extras.status || "issued",
    fileUrl: extras.fileUrl || "",
    qrUrl: `/verify/${row.id}`,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || "",
    reissueReason: row.reissue_reason || extras.reason || "",
  };
}

function readPlainUploadedFile(file, apiFileEncryption) {
  const stored = fs.readFileSync(file.path);
  if (!apiFileEncryption) return stored;
  return decryptClientFile(stored, apiFileEncryption);
}

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function createStudentIdHash(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function chainStatusForDb(receipt = {}) {
  if (receipt.success || receipt.status === "confirmed") return "confirmed";
  if (receipt.status === "unconfigured") return "pending";
  return receipt.status || "failed";
}

async function saveEncryptedUpload({ file, hash, plainBuffer }) {
  const plain = plainBuffer || fs.readFileSync(file.path);
  const encrypted = encryptBuffer(plain);
  const location = await uploadEncryptedObject({
    buffer: encrypted.ciphertext,
    originalName: file.originalname,
    contentType: file.mimetype,
    hash,
  });
  return { location, encryptionMetadata: encrypted.metadata };
}

exports.uploadDocument = async (req, res) => {
  try {
    await ensureSecurityColumns();
    const file = (req.files && req.files[0]) || req.file;
    if (!file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const { enrollmentNumber, rollNumber, studentName, studentEmail, course, degreeTitle, department, graduationYear } = req.body;
    if (!enrollmentNumber || !rollNumber || !studentName) {
      return res.status(400).json({ success: false, message: "Missing student details" });
    }

    const student = await upsertStudent({ studentName, studentEmail, enrollmentNumber, rollNumber, course });
    const plainBuffer = readPlainUploadedFile(file, req.body.apiFileEncryption);
    const fileHash = sha256Buffer(plainBuffer);
    if (req.body.documentHash && String(req.body.documentHash).trim().toLowerCase() !== fileHash.toLowerCase()) {
      return res.status(400).json({ success: false, message: "Client hash does not match uploaded raw file bytes. Upload blocked." });
    }
    const studentIdHash = createStudentIdHash(enrollmentNumber || studentEmail);
    const blockchain = await storeHashOnBlockchain(fileHash, {
      studentIdHash,
      metadataURI: `trustchain:document:${fileHash.slice(0, 16)}`
    });
    const txHash = blockchain.txHash || "";
    const encryptedUpload = await saveEncryptedUpload({ file, hash: fileHash, plainBuffer });

    const doc = await pool.query(
      `INSERT INTO documents(
        student_id, file_name, file_hash, uploaded_by, polygon_tx, tampered, version, status,
        gcs_provider, gcs_bucket, gcs_object_name, encryption_metadata, original_file_name, mime_type,
        blockchain_status, blockchain_error, block_number, degree_title, department, graduation_year, university
      )
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING *`,
      [
        student.id, file.filename, fileHash, req.user?.id || 1, txHash, false, 1, "issued",
        encryptedUpload.location.provider, encryptedUpload.location.bucket, encryptedUpload.location.objectName,
        JSON.stringify(encryptedUpload.encryptionMetadata), file.originalname, file.mimetype,
        chainStatusForDb(blockchain), blockchain.error || null, blockchain.blockNumber || null,
        degreeTitle || "Bachelor of Technology", department || null, graduationYear || null, "Oriental University"
      ]
    );

    await audit(req, "credential_created", "document", doc.rows[0].id, true);
    await pool.query(`INSERT INTO logs(action) VALUES($1)`, [`Document uploaded for ${studentName}`]).catch(() => undefined);

    const signedUrl = await createSignedUrl(encryptedUpload.location).catch(() => "");
    return res.json({
      success: true,
      message: blockchain.success
        ? "Document uploaded, encrypted, stored, hashed, and anchored on blockchain successfully."
        : "Document uploaded, encrypted, stored, and hashed. Blockchain anchoring is pending/failed; check blockchain field for details.",
      blockchain_status: blockchain.success ? "BLOCKCHAIN_CONFIRMED" : "BLOCKCHAIN_PENDING",
      blockchain,
      credential: buildCredential(doc.rows[0], student, {
        studentEmail, degreeTitle, department, graduationYear, txHash, fileUrl: signedUrl,
        blockNumber: blockchain.blockNumber, gasUsed: blockchain.gasUsed,
        blockchainStatus: chainStatusForDb(blockchain), blockchainError: blockchain.error
      }),
    });
  } catch (error) {
    console.log("UPLOAD ERROR:", error);
    await audit(req, "credential_create_failed", "document", "", false, error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.reissueDocument = async (req, res) => {
  try {
    await ensureSecurityColumns();
    const file = (req.files && req.files[0]) || req.file;
    if (!file) return res.status(400).json({ success: false, message: "Corrected document file is required for reissue" });
    const { documentId } = req.params;
    const { studentName, studentEmail, enrollmentNumber, rollNumber, course, degreeTitle, department, graduationYear, reason } = req.body;

    const old = await pool.query(`SELECT documents.*, students.* FROM documents JOIN students ON documents.student_id=students.id WHERE documents.id=$1 LIMIT 1`, [documentId]);
    if (!old.rows.length) return res.status(404).json({ success: false, message: "Original document not found" });
    const oldDoc = old.rows[0];

    const student = await upsertStudent({
      studentName: studentName || oldDoc.student_name,
      studentEmail: studentEmail || "",
      enrollmentNumber: enrollmentNumber || oldDoc.enrollment_no,
      rollNumber: rollNumber || oldDoc.roll_no,
      course: course || oldDoc.course,
    });
    const plainBuffer = readPlainUploadedFile(file, req.body.apiFileEncryption);
    const fileHash = sha256Buffer(plainBuffer);
    if (req.body.documentHash && String(req.body.documentHash).trim().toLowerCase() !== fileHash.toLowerCase()) {
      return res.status(400).json({ success: false, message: "Client hash does not match corrected file bytes. Reissue blocked." });
    }
    const blockchain = await reissueHashOnBlockchain(oldDoc.file_hash, fileHash, reason || "Reissued credential");
    const txHash = blockchain.txHash || "";
    const encryptedUpload = await saveEncryptedUpload({ file, hash: fileHash, plainBuffer });
    const newVersion = Number(oldDoc.version || 1) + 1;

    await pool.query(`UPDATE documents SET status='superseded' WHERE id=$1`, [documentId]);
    const inserted = await pool.query(
      `INSERT INTO documents(
        student_id, file_name, file_hash, uploaded_by, polygon_tx, tampered, version, previous_document_id, status, reissue_reason,
        gcs_provider, gcs_bucket, gcs_object_name, encryption_metadata, original_file_name, mime_type,
        blockchain_status, blockchain_error, block_number, degree_title, department, graduation_year, university
      )
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING *`,
      [
        student.id, file.filename, fileHash, req.user?.id || oldDoc.uploaded_by || 1, txHash, false, newVersion, documentId,
        "reissued", reason || "Corrected and reissued by issuer",
        encryptedUpload.location.provider, encryptedUpload.location.bucket, encryptedUpload.location.objectName,
        JSON.stringify(encryptedUpload.encryptionMetadata), file.originalname, file.mimetype,
        chainStatusForDb(blockchain), blockchain.error || null, blockchain.blockNumber || null,
        degreeTitle || oldDoc.degree_title || "Bachelor of Technology", department || oldDoc.department || null,
        graduationYear || oldDoc.graduation_year || null, oldDoc.university || "Oriental University"
      ]
    );

    await audit(req, "credential_reissued", "document", inserted.rows[0].id, true);
    const signedUrl = await createSignedUrl(encryptedUpload.location).catch(() => "");
    return res.json({
      success: true,
      message: blockchain.success
        ? "Credential reissued successfully and anchored on blockchain. Old version is preserved as superseded."
        : "Credential reissued in database. Blockchain reissue is pending/failed; check blockchain field for details.",
      blockchain_status: blockchain.success ? "BLOCKCHAIN_CONFIRMED" : "BLOCKCHAIN_PENDING",
      blockchain,
      credential: buildCredential(inserted.rows[0], student, {
        studentEmail, degreeTitle, department, graduationYear, txHash, fileUrl: signedUrl, reason,
        blockNumber: blockchain.blockNumber, gasUsed: blockchain.gasUsed,
        blockchainStatus: chainStatusForDb(blockchain), blockchainError: blockchain.error
      }),
    });
  } catch (error) {
    console.log("REISSUE ERROR:", error);
    await audit(req, "credential_reissue_failed", "document", req.params.documentId, false, error.message);
    return res.status(500).json({ success: false, message: "Failed to reissue document", error: error.message });
  }
};

exports.downloadDocument = async (req, res) => {
  try {
    await ensureSecurityColumns();
    const result = await pool.query(`SELECT * FROM documents WHERE id=$1 LIMIT 1`, [req.params.documentId]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: "Document not found" });
    const doc = result.rows[0];
    const location = { provider: doc.gcs_provider || "local", bucket: doc.gcs_bucket || "local", objectName: doc.gcs_object_name || doc.file_name };
    const encrypted = await readEncryptedObject(location);
    const decrypted = decryptBuffer(encrypted, typeof doc.encryption_metadata === "string" ? JSON.parse(doc.encryption_metadata) : doc.encryption_metadata);
    await audit(req, "credential_downloaded", "document", doc.id, true);
    res.setHeader("Content-Type", doc.mime_type || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${doc.original_file_name || doc.file_name || 'document'}"`);
    return res.send(decrypted);
  } catch (error) {
    console.log("DOWNLOAD ERROR:", error);
    return res.status(500).json({ success: false, message: "Download failed", error: error.message });
  }
};

exports.createDocumentSignedUrl = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM documents WHERE id=$1 LIMIT 1`, [req.params.documentId]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: "Document not found" });
    const doc = result.rows[0];
    const signedUrl = await createSignedUrl({ provider: doc.gcs_provider, bucket: doc.gcs_bucket, objectName: doc.gcs_object_name });
    await audit(req, "drive_temporary_url_created", "document", doc.id, true);
    return res.json({ success: true, signedUrl, expiresInMinutes: Number(process.env.GOOGLE_DRIVE_LINK_EXPIRES_MINUTES || 15) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not create signed URL", error: error.message });
  }
};

exports.downloadDriveToken = async (req, res) => {
  try {
    const { decryptText } = require("../services/cryptoService");
    const token = req.query.token;
    if (!token) return res.status(400).json({ success: false, message: "Missing token" });
    const payload = JSON.parse(decryptText(token));
    if (!payload.exp || Date.now() > Number(payload.exp)) {
      return res.status(403).json({ success: false, message: "Temporary download link expired" });
    }
    if (payload.provider !== "google-drive" || !payload.driveFileId) {
      return res.status(400).json({ success: false, message: "Invalid Drive download token" });
    }
    // Deliberately do not expose raw Google Drive file id in the browser URL.
    return res.status(403).json({
      success: false,
      message: "Direct Google Drive downloads are disabled in demo mode. Use protected /api/issuer/documents/:id/download instead.",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: "Invalid download token", error: error.message });
  }
};
