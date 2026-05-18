const fs = require("fs");
const pool = require("../config/db");
const generateFileHash = require("../services/hashService");
const crypto = require("crypto");
const { decryptClientFile } = require("../services/apiWrapperCrypto");
const { verifyHashOnBlockchain } = require("../services/polygonService");
const { analyzeWithAiService } = require("../services/aiIntegrityService");

const normalizeHash = (value = "") => String(value || "").trim().toLowerCase();
const normalizeText = (value = "") => String(value || "").trim().toLowerCase();
const isActiveStatus = (status = "") => ["active", "issued", "reissued", "verified"].includes(String(status || "issued").toLowerCase());

function deterministicNumber(seed = "", min = 0, max = 9) {
  const text = String(seed || "trustchain");
  let total = 0;
  for (let i = 0; i < text.length; i += 1) total = (total + text.charCodeAt(i) * (i + 1)) % 9973;
  return min + (total % (max - min + 1));
}

function buildFallbackAiLayer({ hashMatched, uploadedHash = "", originalHash = "", record, candidate, reason, statusOverride }) {
  const trusted = record || candidate || {};
  const hasStudentContext = Boolean(trusted.student_name || trusted.email || trusted.enrollment_no);
  const hashDifference = uploadedHash && originalHash && uploadedHash !== originalHash;

  let score;
  if (hashMatched) {
    score = 90;
    if (trusted.polygon_tx) score += 3;
    if (trusted.student_name) score += 2;
    if (trusted.enrollment_no) score += 2;
    if (trusted.course) score += 1;
    score += deterministicNumber(uploadedHash, 0, 2);
    score = Math.min(score, 99);
  } else {
    score = 6;
    if (hasStudentContext) score += 8;
    if (originalHash) score += 4;
    if (hashDifference) score += 3;
    score += deterministicNumber(uploadedHash || reason, 0, 7);
    score = Math.min(score, originalHash ? 31 : 18);
  }

  const riskLevel = score >= 85 ? "low" : score >= 55 ? "medium" : "high";
  const aiStatus = hashMatched ? "authentic" : statusOverride || "tampered";
  const matchedFields = [];
  const mismatchedFields = [];
  const riskFactors = [];
  const aiDecisionTrace = [];

  if (hashMatched) {
    matchedFields.push("documentHash");
    aiDecisionTrace.push("Raw uploaded file bytes produced a SHA-256 hash that exactly matches an active issued credential record.");
    if (trusted.student_name) matchedFields.push("studentIdentityContext");
    if (trusted.enrollment_no) matchedFields.push("enrollmentContext");
    if (trusted.polygon_tx) matchedFields.push("blockchainProofReference");
    aiDecisionTrace.push("AI treated cryptographic hash match as the strongest trust signal and used metadata only as supporting context.");
    aiDecisionTrace.push(`Final AI risk classification: ${riskLevel.toUpperCase()} risk with ${score}% integrity confidence.`);
  } else {
    mismatchedFields.push("documentHash");
    riskFactors.push("The uploaded file hash does not match any currently active issued credential hash.");
    aiDecisionTrace.push("The uploaded document was hashed from raw file bytes using SHA-256.");
    aiDecisionTrace.push(originalHash ? "A related trusted credential context was found, but its registered hash is different from the uploaded hash." : "No trusted active credential was found for this exact uploaded hash.");
    aiDecisionTrace.push("Because even a one-byte edit changes SHA-256, the mismatch is treated as tamper evidence.");
    if (reason) riskFactors.push(reason);
    if (hasStudentContext) {
      matchedFields.push("studentOrEnrollmentContext");
      riskFactors.push("Student/enrollment context may exist, but context alone cannot verify the uploaded file.");
    }
    aiDecisionTrace.push(`Final AI risk classification: ${riskLevel.toUpperCase()} risk with ${score}% integrity confidence.`);
  }

  const summary = hashMatched
    ? `AI Integrity Engine rates this credential as low risk (${score}%) because the uploaded file hash exactly matches the issued credential record.`
    : `AI Integrity Engine rates this upload as high risk (${score}%) because the uploaded file hash does not match the trusted issued document hash.`;

  return {
    aiIntegrityScore: score,
    integrity_score: score,
    riskLevel,
    aiStatus,
    aiSummary: summary,
    aiExplanation: aiDecisionTrace,
    aiDecisionTrace,
    aiThoughtOutput: aiDecisionTrace,
    riskFactors,
    matchedFields,
    mismatchedFields,
    uploadedHash,
    originalHash: originalHash || trusted.file_hash || ""
  };
}

async function callAiIntegrityEngine(payload, fallbackArgs) {
  const ai = await analyzeWithAiService(payload);

  // Preserve strict cryptographic result. AI explains risk; it never overrides hash truth.
  const expectedStatus = fallbackArgs?.hashMatched ? "authentic" : (fallbackArgs?.statusOverride || "tampered");
  return {
    ...ai,
    // Keep AI classification separate so it never overwrites backend status
    // values such as verified/tampered/rejected/pending.
    aiStatus: ai.status || expectedStatus,
    uploadedHash: payload.uploadedHash,
    originalHash: payload.originalHash,
  };
}

function readUploadedVerificationBytes(req) {
  const stored = fs.readFileSync(req.file.path);
  if (!req.body.apiFileEncryption) return stored;
  return decryptClientFile(stored, req.body.apiFileEncryption);
}

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function buildCredentialRecord(record = {}) {
  return {
    studentName: record.student_name || record.studentName || "Not disclosed",
    enrollmentNo: record.enrollment_no || record.enrollmentNumber || "Not disclosed",
    degree: record.degree_title || record.degreeTitle || "Bachelor of Technology",
    department: record.department || record.course || "Not disclosed",
    graduationYear: String(record.graduation_year || record.graduationYear || "Not disclosed"),
    university: record.university || "Oriental University"
  };
}

function buildExtractedFieldsFromRequest(req, record = {}) {
  return {
    studentName: req.body.studentName || req.body.student_name || "",
    enrollmentNo: req.body.enrollmentNumber || req.body.enrollmentNo || req.body.enrollment_no || record.enrollment_no || "",
    degree: req.body.degreeTitle || req.body.degree || record.degree_title || "",
    department: req.body.department || req.body.course || record.department || record.course || "",
    graduationYear: String(req.body.graduationYear || req.body.graduation_year || record.graduation_year || "")
  };
}

async function loadBlockchainProof(document, hash) {
  let blockchain = {
    exists: Boolean(document?.polygon_tx),
    timestamp: document?.created_at,
    issuer: document?.uploaded_by,
    status: document?.blockchain_status || (document?.polygon_tx ? "confirmed" : "pending"),
    error: document?.blockchain_error || "",
  };

  try {
    const chainResult = await verifyHashOnBlockchain(hash || document?.file_hash);
    blockchain = {
      exists: Boolean(chainResult?.[0]),
      timestamp: chainResult?.[1] ? Number(chainResult[1]) : document?.created_at,
      issuer: chainResult?.[2] || document?.uploaded_by,
      status: chainResult?.[4] || document?.blockchain_status || (document?.polygon_tx ? "confirmed" : "pending"),
      error: document?.blockchain_error || "",
    };
  } catch (error) {
    console.log("Blockchain verify fallback:", error.message);
  }

  return blockchain;
}

async function findByExactHash(hash) {
  const result = await pool.query(
    `
    SELECT
      documents.*,
      students.student_name,
      students.email,
      students.enrollment_no,
      students.roll_no,
      students.course
    FROM documents
    JOIN students ON documents.student_id = students.id
    WHERE LOWER(documents.file_hash) = LOWER($1)
    ORDER BY documents.created_at DESC
    LIMIT 1
    `,
    [hash]
  );
  return result.rows[0];
}

async function findLatestByEnrollment(enrollmentNumber) {
  if (!enrollmentNumber) return undefined;
  const result = await pool.query(
    `
    SELECT
      documents.*,
      students.student_name,
      students.email,
      students.enrollment_no,
      students.roll_no,
      students.course
    FROM documents
    JOIN students ON documents.student_id = students.id
    WHERE LOWER(students.enrollment_no) = LOWER($1)
    AND COALESCE(documents.status,'issued') IN ('active','issued','reissued','verified')
    ORDER BY documents.created_at DESC
    LIMIT 1
    `,
    [String(enrollmentNumber).trim()]
  );
  return result.rows[0];
}

async function findLatestByStudentEmail(studentEmail) {
  if (!studentEmail) return undefined;
  const result = await pool.query(
    `
    SELECT
      documents.*,
      students.student_name,
      students.email,
      students.enrollment_no,
      students.roll_no,
      students.course
    FROM documents
    JOIN students ON documents.student_id = students.id
    WHERE LOWER(students.email) = LOWER($1)
    AND COALESCE(documents.status,'issued') IN ('active','issued','reissued','verified')
    ORDER BY documents.created_at DESC
    LIMIT 1
    `,
    [String(studentEmail).trim().toLowerCase()]
  );
  return result.rows[0];
}

async function findCandidateRecord(req) {
  const enrollmentNumber = String(req.body.enrollmentNumber || req.body.enrollmentNo || "").trim();
  const studentEmail = String(req.body.studentEmail || req.body.student_email || "").trim().toLowerCase();
  return (await findLatestByEnrollment(enrollmentNumber)) || (await findLatestByStudentEmail(studentEmail));
}

async function buildVerifiedResponse(document, inputHash, req) {
  const blockchain = await loadBlockchainProof(document, inputHash || document.file_hash);
  const ai = await callAiIntegrityEngine({
    uploadedHash: inputHash || document.file_hash,
    originalHash: document.file_hash,
    verificationStatus: "verified",
    hashMatched: true,
    blockchainFound: Boolean(blockchain.exists || document.polygon_tx),
    extractedFields: buildExtractedFieldsFromRequest(req, document),
    credentialRecord: buildCredentialRecord(document),
    context: {
      source: "direct_verify",
      fileName: req.file?.originalname || "hash-input",
      mimeType: req.file?.mimetype || "unknown",
      fileSizeBytes: req.file?.size || 0,
      reason: "Exact SHA-256 hash match."
    }
  }, {
    hashMatched: true,
    uploadedHash: inputHash || document.file_hash,
    originalHash: document.file_hash,
    record: document
  });

  return {
    success: true,
    verified: true,
    authentic: true,
    status: "verified",
    student_name: document.student_name,
    studentName: document.student_name,
    studentEmail: document.email,
    enrollmentNumber: document.enrollment_no,
    rollNumber: document.roll_no,
    course: document.course,
    university: document.university || "Oriental University",
    degreeTitle: document.degree_title || "Bachelor of Technology",
    file_hash: document.file_hash,
    documentHash: document.file_hash,
    txHash: document.polygon_tx || document.tx_hash || "",
    blockNumber: document.block_number || "local",
    timestamp: new Date().toISOString(),
    blockchain,
    message: "Verified: uploaded file SHA-256 exactly matches an active issued credential hash.",
    reason: "The uploaded file bytes produced the same SHA-256 fingerprint as the trusted issued record.",
    ...ai
  };
}

async function buildTamperedResponse({ req, uploadedHash = "", reason, candidate }) {
  const ai = await callAiIntegrityEngine({
    uploadedHash,
    originalHash: candidate?.file_hash || "",
    verificationStatus: "tampered",
    hashMatched: false,
    blockchainFound: false,
    extractedFields: buildExtractedFieldsFromRequest(req, candidate || {}),
    credentialRecord: buildCredentialRecord(candidate || {}),
    context: {
      source: "direct_verify",
      fileName: req.file?.originalname || "hash-input",
      mimeType: req.file?.mimetype || "unknown",
      fileSizeBytes: req.file?.size || 0,
      reason
    }
  }, {
    hashMatched: false,
    uploadedHash,
    originalHash: candidate?.file_hash || "",
    candidate,
    reason
  });

  return {
    success: true,
    verified: false,
    authentic: false,
    status: "tampered",
    documentHash: uploadedHash,
    file_hash: uploadedHash,
    timestamp: new Date().toISOString(),
    reason,
    message: "Tamper alert: no active issued credential has this exact SHA-256 file hash.",
    ...ai
  };
}

exports.verifyDocument = async (req, res) => {
  try {
    let uploadedHash = "";
    const clientHash = normalizeHash(req.body.documentHash);
    const enrollmentNumber = String(req.body.enrollmentNumber || req.body.enrollmentNo || "").trim();

    if (req.file) {
      console.log("VERIFY FILE RECEIVED:", req.file.originalname);
      const plainBuffer = readUploadedVerificationBytes(req);
      uploadedHash = normalizeHash(sha256Buffer(plainBuffer));
      console.log("VERIFY GENERATED RAW FILE HASH:", uploadedHash);

      if (clientHash && clientHash !== uploadedHash) {
        const candidate = await findCandidateRecord(req);
        return res.json(await buildTamperedResponse({
          req,
          uploadedHash,
          candidate,
          reason: "Client-provided hash does not match the SHA-256 hash calculated from the uploaded raw file bytes."
        }));
      }
    } else if (clientHash) {
      uploadedHash = clientHash;
    }

    if (!uploadedHash && !enrollmentNumber) {
      return res.status(400).json({
        success: false,
        verified: false,
        authentic: false,
        status: "tampered",
        integrity_score: 0,
        aiIntegrityScore: 0,
        riskLevel: "high",
        aiSummary: "No document file or hash was provided, so AI cannot perform integrity analysis.",
        aiExplanation: ["Upload the actual credential file or paste a SHA-256 hash.", "Enrollment-only lookup cannot prove document integrity."],
        message: "Upload a file or provide a SHA-256 hash. Enrollment-only lookup cannot prove file integrity.",
      });
    }

    if (uploadedHash) {
      const record = await findByExactHash(uploadedHash);
      if (!record) {
        const candidate = await findCandidateRecord(req);
        return res.json(await buildTamperedResponse({
          req,
          uploadedHash,
          candidate,
          reason: "No issued credential record matches the exact SHA-256 hash of this uploaded file. The file may be edited, corrupted, or never issued."
        }));
      }

      const status = String(record.status || "issued").toLowerCase();
      if (status === "superseded" || status === "revoked") {
        return res.json({
          success: true,
          verified: false,
          authentic: false,
          status,
          documentHash: record.file_hash,
          uploadedHash,
          timestamp: new Date().toISOString(),
          reason: status === "superseded"
            ? "This exact document version exists, but it was superseded by a newer reissued credential."
            : "This exact document version exists, but it has been revoked by the issuer.",
          message: "Document hash found but this version is not currently active.",
          ...(await callAiIntegrityEngine({
            uploadedHash,
            originalHash: record.file_hash,
            verificationStatus: status,
            hashMatched: false,
            blockchainFound: Boolean(record.polygon_tx),
            extractedFields: buildExtractedFieldsFromRequest(req, record),
            credentialRecord: buildCredentialRecord(record),
            context: { source: "direct_verify", reason: "Matched credential is not active." }
          }, { hashMatched: false, uploadedHash, originalHash: record.file_hash, record, reason: "Matched credential is not active.", statusOverride: status }))
        });
      }

      if (!isActiveStatus(record.status)) {
        const candidate = record;
        return res.json(await buildTamperedResponse({
          req,
          uploadedHash,
          candidate,
          reason: `Credential hash exists but has unsupported status: ${record.status || "unknown"}.`
        }));
      }

      return res.json(await buildVerifiedResponse(record, uploadedHash, req));
    }

    const record = await findLatestByEnrollment(enrollmentNumber);
    if (!record) {
      return res.json(await buildTamperedResponse({
        req,
        uploadedHash: "",
        reason: "No active issued credential record matches this enrollment number."
      }));
    }

    const ai = await callAiIntegrityEngine({
      uploadedHash: "",
      originalHash: record.file_hash,
      verificationStatus: "record_found",
      hashMatched: false,
      blockchainFound: Boolean(record.polygon_tx),
      extractedFields: buildExtractedFieldsFromRequest(req, record),
      credentialRecord: buildCredentialRecord(record),
      context: { source: "metadata_lookup", reason: "Enrollment lookup found a record, but no file hash was uploaded." }
    }, {
      hashMatched: false,
      uploadedHash: "",
      originalHash: record.file_hash,
      candidate: record,
      reason: "Credential metadata exists, but direct verification requires the actual file or SHA-256 hash. Enrollment alone is not tamper-proof.",
      statusOverride: "record_found"
    });

    return res.json({
      success: true,
      verified: false,
      authentic: false,
      status: "record_found",
      studentName: record.student_name,
      studentEmail: record.email,
      enrollmentNumber: record.enrollment_no,
      rollNumber: record.roll_no,
      course: record.course,
      documentHash: record.file_hash,
      txHash: record.polygon_tx || "",
      blockNumber: record.block_number || "local",
      timestamp: new Date().toISOString(),
      reason: "Credential metadata exists, but direct verification requires the actual file or its SHA-256 hash. Enrollment alone is not tamper-proof.",
      ...ai
    });
  } catch (error) {
    console.log("VERIFY ERROR:", error);
    return res.status(500).json({ success: false, authentic: false, verified: false, status: "error", error: error.message });
  } finally {
    if (req.file?.path) {
      fs.unlink(req.file.path, () => undefined);
    }
  }
};
