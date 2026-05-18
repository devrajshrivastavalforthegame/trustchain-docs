const express = require("express");
const pool = require("../config/db");
const { upload, handleMulterError } = require("../middleware/uploadLimit");
const { verifyDocument } = require("../controllers/userController");
const { requireAuth, requireRole } = require("../middleware/secureAuth");
const { analyzeWithAiService, credentialRecordFromRow, extractedFieldsFromContext } = require("../services/aiIntegrityService");

const router = express.Router();

const normalizeHash = (value = "") => String(value || "").trim().toLowerCase();
const normalizeEmail = (value = "") => String(value || "").trim().toLowerCase();
const isEmail = (value = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

let tableReady = false;
async function ensureVerificationRequestsTable() {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS verification_requests (
      id SERIAL PRIMARY KEY,
      student_email VARCHAR(255) NOT NULL,
      requester_email VARCHAR(255),
      requester_name VARCHAR(255),
      company VARCHAR(255),
      enrollment_no VARCHAR(100),
      document_hash TEXT,
      uploaded_hash TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      result JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query("ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS student_email VARCHAR(255)");
  await pool.query("ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS requester_email VARCHAR(255)");
  await pool.query("ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS requester_name VARCHAR(255)");
  await pool.query("ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS company VARCHAR(255)");
  await pool.query("ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS enrollment_no VARCHAR(100)");
  await pool.query("ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS document_hash TEXT");
  await pool.query("ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS uploaded_hash TEXT");
  await pool.query("ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'");
  await pool.query("ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS result JSONB");
  await pool.query("ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await pool.query("ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  tableReady = true;
}

function mapRequest(row) {
  if (!row) return undefined;
  return {
    id: String(row.id),
    studentEmail: row.student_email || "",
    requesterEmail: row.requester_email || "",
    requesterName: row.requester_name || "Employer",
    company: row.company || "Hiring Organization",
    enrollmentNumber: row.enrollment_no || "",
    documentHash: row.document_hash || row.uploaded_hash || "",
    status: row.status || "pending",
    result: row.result || undefined,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

async function findStudentByEmail(studentEmail) {
  const result = await pool.query(
    `SELECT id, email, student_name, enrollment_no, roll_no, course
     FROM students
     WHERE LOWER(COALESCE(email, '')) = LOWER($1)
     LIMIT 1`,
    [studentEmail]
  );
  return result.rows[0];
}

async function findCredentialForStudent({ studentEmail, documentHash, enrollmentNumber }) {
  const params = [normalizeEmail(studentEmail)];
  let extraWhere = "";

  if (documentHash) {
    params.push(normalizeHash(documentHash));
    extraWhere = `AND LOWER(documents.file_hash) = LOWER($${params.length})`;
  } else if (enrollmentNumber) {
    params.push(String(enrollmentNumber).trim());
    extraWhere = `AND students.enrollment_no = $${params.length}`;
  }

  const result = await pool.query(
    `SELECT
       documents.*,
       students.student_name,
       students.email,
       students.enrollment_no,
       students.roll_no,
       students.course
     FROM documents
     JOIN students ON documents.student_id = students.id
     WHERE LOWER(COALESCE(students.email, '')) = LOWER($1)
       ${extraWhere}
       AND COALESCE(documents.status, 'active') IN ('active', 'issued', 'reissued')
     ORDER BY documents.created_at DESC
     LIMIT 1`,
    params
  );
  return result.rows[0];
}

function deterministicNumber(seed = "", min = 0, max = 9) {
  const text = String(seed || "trustchain");
  let total = 0;
  for (let i = 0; i < text.length; i += 1) total = (total + text.charCodeAt(i) * (i + 1)) % 9973;
  return min + (total % (max - min + 1));
}

async function buildAiAudit({ verified, credential, request, hadHash, reason, status = undefined }) {
  const documentHash = normalizeHash(request?.document_hash || request?.uploaded_hash || request?.documentHash || "");
  const originalHash = normalizeHash(credential?.file_hash || credential?.documentHash || "");
  const hashMatched = Boolean(verified && credential && (!hadHash || (documentHash && originalHash && documentHash === originalHash)));

  const ai = await analyzeWithAiService({
    uploadedHash: documentHash || originalHash,
    originalHash,
    verificationStatus: status || (verified ? "verified" : "tampered"),
    hashMatched,
    blockchainFound: Boolean(credential?.polygon_tx || credential?.tx_hash),
    extractedFields: extractedFieldsFromContext({
      studentEmail: request?.student_email || request?.studentEmail,
      enrollmentNo: request?.enrollment_no || request?.enrollmentNumber,
    }, credential || {}),
    credentialRecord: credentialRecordFromRow(credential || {}),
    context: {
      source: "email_consent_request",
      requestId: request?.id,
      studentEmail: request?.student_email || request?.studentEmail,
      requesterEmail: request?.requester_email || request?.requesterEmail,
      company: request?.company,
      hadHash,
      reason,
    },
  });

  return {
    ...ai,
    aiStatus: ai.status || (verified ? "authentic" : status || "tampered"),
    uploadedHash: documentHash,
    originalHash,
  };
}

async function buildApprovedResult({ credential, request, hadHash }) {
  const documentHash = request.document_hash || request.uploaded_hash || "";

  if (hadHash && !credential) {
    const reason = "Student approved the consent request, but the uploaded/pasted document hash does not match any active credential issued to this student's email.";
    return {
      authentic: false,
      verified: false,
      status: "tampered",
      documentHash,
      timestamp: new Date().toISOString(),
      reason,
      ...(await buildAiAudit({ verified: false, credential, request, hadHash, reason, status: "tampered" }))
    };
  }

  if (!credential) {
    const reason = "Student approved the consent request. Upload or paste the document hash to perform final tamper-proof verification.";
    return {
      authentic: false,
      verified: false,
      status: "pending",
      documentHash,
      timestamp: new Date().toISOString(),
      reason,
      ...(await buildAiAudit({ verified: false, credential, request, hadHash, reason, status: "pending" }))
    };
  }

  return {
    authentic: true,
    verified: true,
    status: "verified",
    studentName: credential.student_name,
    studentEmail: credential.email,
    enrollmentNumber: credential.enrollment_no,
    rollNumber: credential.roll_no,
    course: credential.course,
    university: credential.university || "Oriental University",
    degreeTitle: credential.degree_title || "Bachelor of Technology",
    documentHash: credential.file_hash,
    timestamp: new Date().toISOString(),
    txHash: credential.polygon_tx || credential.tx_hash || "",
    blockNumber: credential.block_number || "",
    blockchainStatus: credential.blockchain_status || (credential.polygon_tx ? "confirmed" : "pending"),
    reason: hadHash
      ? "Student approved the request and the submitted hash exactly matches an active issued credential for this student email."
      : "Student approved the request and a credential record exists for this student email/enrollment number.",
    ...(await buildAiAudit({ verified: true, credential, request, hadHash, status: "verified" }))
  };
}

router.post("/request", requireAuth, requireRole("employer", "issuer", "developer", "admin"), async (req, res) => {
  try {
    await ensureVerificationRequestsTable();

    const studentEmail = normalizeEmail(req.body.studentEmail);
    const requesterEmail = normalizeEmail(req.body.requesterEmail || req.user.email);
    const requesterName = String(req.body.requesterName || req.user.name || "Employer").trim();
    const company = String(req.body.company || req.user.organization || "Hiring Organization").trim();
    const enrollmentNumber = String(req.body.enrollmentNumber || "").trim();
    const submittedHash = normalizeHash(req.body.documentHash || req.body.uploadedHash || "");

    if (!studentEmail || !isEmail(studentEmail)) {
      return res.status(400).json({
        success: false,
        message: "Student Gmail/email is required to send a verification request."
      });
    }

    const student = await findStudentByEmail(studentEmail);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "No issued student credential was found for this email. Ask the issuer to upload a credential for this Gmail first."
      });
    }

    const inserted = await pool.query(
      `INSERT INTO verification_requests
       (student_email, requester_email, requester_name, company, enrollment_no, document_hash, uploaded_hash, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6, 'pending', NOW(), NOW())
       RETURNING *`,
      [studentEmail, requesterEmail, requesterName, company, enrollmentNumber || student.enrollment_no || null, submittedHash || null]
    );

    return res.json({ success: true, request: mapRequest(inserted.rows[0]) });
  } catch (error) {
    console.error("Create verification request error:", error);
    return res.status(500).json({ success: false, message: "Failed to create verification request.", error: error.message });
  }
});

router.get("/request", requireAuth, async (req, res) => {
  try {
    await ensureVerificationRequestsTable();
    const emailFilter = normalizeEmail(req.query.email || "");
    const userEmail = normalizeEmail(req.user.email || "");
    let query;
    let params;

    if (req.user.role === "student") {
      query = `SELECT * FROM verification_requests WHERE LOWER(student_email) = LOWER($1) ORDER BY created_at DESC`;
      params = [userEmail];
    } else if (["developer", "admin"].includes(req.user.role)) {
      if (emailFilter) {
        query = `SELECT * FROM verification_requests WHERE LOWER(student_email) = LOWER($1) ORDER BY created_at DESC`;
        params = [emailFilter];
      } else {
        query = `SELECT * FROM verification_requests ORDER BY created_at DESC`;
        params = [];
      }
    } else {
      query = `SELECT * FROM verification_requests WHERE LOWER(requester_email) = LOWER($1) ORDER BY created_at DESC`;
      params = [userEmail];
    }

    const result = await pool.query(query, params);
    return res.json(result.rows.map(mapRequest));
  } catch (error) {
    console.error("List verification requests error:", error);
    return res.status(500).json({ success: false, message: "Failed to list verification requests.", error: error.message });
  }
});

router.get("/request/:id", requireAuth, async (req, res) => {
  try {
    await ensureVerificationRequestsTable();
    const result = await pool.query(`SELECT * FROM verification_requests WHERE id = $1 LIMIT 1`, [req.params.id]);
    const row = result.rows[0];
    if (!row) return res.status(404).json({ success: false, message: "Request not found" });

    const userEmail = normalizeEmail(req.user.email || "");
    const ownStudent = req.user.role === "student" && normalizeEmail(row.student_email) === userEmail;
    const ownRequester = normalizeEmail(row.requester_email) === userEmail;
    if (!ownStudent && !ownRequester && !["developer", "admin", "issuer"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    return res.json({ success: true, request: mapRequest(row) });
  } catch (error) {
    console.error("Get verification request error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch verification request.", error: error.message });
  }
});

router.patch("/request/:id", requireAuth, requireRole("student", "developer", "admin"), async (req, res) => {
  try {
    await ensureVerificationRequestsTable();

    const existing = await pool.query(`SELECT * FROM verification_requests WHERE id = $1 LIMIT 1`, [req.params.id]);
    const request = existing.rows[0];
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });

    const userEmail = normalizeEmail(req.user.email || "");
    if (req.user.role === "student" && normalizeEmail(request.student_email) !== userEmail) {
      return res.status(403).json({ success: false, message: "Students can only resolve requests sent to their own Gmail/email." });
    }

    const decision = String(req.body.status || "").toLowerCase();
    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ success: false, message: "Status must be approved or rejected." });
    }

    let resultPayload;
    if (decision === "approved") {
      const hadHash = Boolean(request.document_hash || request.uploaded_hash);
      const credential = await findCredentialForStudent({
        studentEmail: request.student_email,
        documentHash: request.document_hash || request.uploaded_hash,
        enrollmentNumber: request.enrollment_no,
      });
      resultPayload = await buildApprovedResult({ credential, request, hadHash });
    } else {
      resultPayload = {
        authentic: false,
        verified: false,
        status: "rejected",
        timestamp: new Date().toISOString(),
        aiIntegrityScore: 0,
        riskLevel: "none",
        reason: "Student rejected the verification request.",
        aiSummary: "Student rejected disclosure, so the AI Integrity Engine did not analyze the document.",
        aiExplanation: ["The consent gate stopped the verification workflow before hash analysis."],
        aiDecisionTrace: ["Student rejected the disclosure request.", "No credential data was released to the employer."],
        matchedFields: [],
        mismatchedFields: [],
        riskFactors: ["Disclosure rejected by student."]
      };
    }

    const updated = await pool.query(
      `UPDATE verification_requests
       SET status = $1, result = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [decision, resultPayload, req.params.id]
    );

    return res.json({ success: true, request: mapRequest(updated.rows[0]) });
  } catch (error) {
    console.error("Resolve verification request error:", error);
    return res.status(500).json({ success: false, message: "Failed to resolve verification request.", error: error.message });
  }
});

router.post("/verify", upload.single("document"), handleMulterError, verifyDocument);
router.get("/verify", async (req, res) => {
  try {
    const id = String(req.query.id || "").trim();
    const hash = normalizeHash(req.query.hash || req.query.documentHash || "");

    if (!id && !hash) {
      return res.status(400).json({
        success: false,
        verified: false,
        authentic: false,
        status: "tampered",
        message: "Use POST /api/verification/verify with a document file for tamper-proof verification."
      });
    }

    const params = [];
    let where = "";
    if (hash) {
      params.push(hash);
      where = "LOWER(documents.file_hash) = LOWER($1)";
    } else {
      params.push(id);
      where = "CAST(documents.id AS TEXT) = $1";
    }

    const result = await pool.query(`
      SELECT documents.*, students.student_name, students.email, students.enrollment_no, students.roll_no, students.course
      FROM documents JOIN students ON documents.student_id = students.id
      WHERE ${where}
      LIMIT 1`, params);

    if (!result.rows.length) {
      const reason = "No issued credential matched this public verification reference.";
      return res.json({
        success: true,
        verified: false,
        authentic: false,
        status: "tampered",
        documentHash: hash,
        reason,
        ...(await buildAiAudit({ verified: false, credential: null, request: { documentHash: hash }, hadHash: Boolean(hash), reason, status: "tampered" }))
      });
    }

    const credential = result.rows[0];
    if (!["active", "issued", "reissued", "verified"].includes(String(credential.status || "issued").toLowerCase())) {
      const reason = "This credential exists but is not an active issued version.";
      return res.json({
        success: true,
        verified: false,
        authentic: false,
        status: String(credential.status || "tampered").toLowerCase(),
        documentHash: credential.file_hash,
        reason,
        ...(await buildAiAudit({ verified: false, credential, request: { documentHash: credential.file_hash }, hadHash: true, reason, status: String(credential.status || "tampered").toLowerCase() }))
      });
    }

    return res.json(await buildApprovedResult({ credential, request: { document_hash: credential.file_hash, student_email: credential.email }, hadHash: true }));
  } catch (error) {
    return res.status(500).json({ success: false, verified: false, authentic: false, status: "error", error: error.message });
  }
});

module.exports = router;
