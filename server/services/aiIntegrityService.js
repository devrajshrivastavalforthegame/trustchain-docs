function normalizeHash(value = "") {
  return String(value || "").trim().toLowerCase();
}

function normalizeText(value = "") {
  return String(value || "").trim().toLowerCase();
}

function deterministicNumber(seed = "", min = 0, max = 9) {
  const text = String(seed || "trustchain");
  let total = 0;
  for (let i = 0; i < text.length; i += 1) {
    total = (total + text.charCodeAt(i) * (i + 1)) % 104729;
  }
  return min + (total % (max - min + 1));
}

function safeArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [];
}

function credentialRecordFromRow(row = {}) {
  return {
    studentName: row.student_name || row.studentName || "Not disclosed",
    enrollmentNo: row.enrollment_no || row.enrollmentNumber || row.enrollmentNo || "Not disclosed",
    degree: row.degree_title || row.degreeTitle || row.degree || "Bachelor of Technology",
    department: row.department || row.course || "Not disclosed",
    graduationYear: String(row.graduation_year || row.graduationYear || row.year || "Not disclosed"),
    university: row.university || "National Institute of Digital Learning",
  };
}

function extractedFieldsFromContext(source = {}, row = {}) {
  return {
    studentName: source.studentName || source.student_name || row.student_name || row.studentName || "",
    enrollmentNo: source.enrollmentNo || source.enrollmentNumber || source.enrollment_no || row.enrollment_no || row.enrollmentNumber || "",
    degree: source.degree || source.degreeTitle || source.degree_title || row.degree_title || row.degreeTitle || "",
    department: source.department || source.course || row.department || row.course || "",
    graduationYear: String(source.graduationYear || source.graduation_year || row.graduation_year || row.graduationYear || ""),
  };
}

function localAiAnalysis(payload = {}, options = {}) {
  const uploadedHash = normalizeHash(payload.uploadedHash);
  const originalHash = normalizeHash(payload.originalHash);
  const hashMatched = typeof payload.hashMatched === "boolean"
    ? payload.hashMatched
    : Boolean(uploadedHash && originalHash && uploadedHash === originalHash);

  const record = payload.credentialRecord || {};
  const extracted = payload.extractedFields || {};
  const context = payload.context || {};
  const seed = [
    uploadedHash,
    originalHash,
    record.studentName,
    record.enrollmentNo,
    record.degree,
    record.department,
    record.university,
    context.fileName,
    context.studentEmail,
    context.requestId,
    context.source,
  ].filter(Boolean).join("|") || "trustchain-ai";

  const matchedFields = [];
  const mismatchedFields = [];
  const riskFactors = [];
  const audit = [];

  function matchField(key, label) {
    const left = normalizeText(extracted[key]);
    const right = normalizeText(record[key]);
    if (!right || right === "not disclosed") return 0;
    if (left && (left === right || left.includes(right) || right.includes(left))) {
      matchedFields.push(label || key);
      return 1;
    }
    if (left) {
      mismatchedFields.push(label || key);
      riskFactors.push(`${label || key} differs from trusted credential metadata.`);
    }
    return 0;
  }

  let metadataMatches = 0;
  metadataMatches += matchField("studentName", "studentName");
  metadataMatches += matchField("enrollmentNo", "enrollmentNo");
  metadataMatches += matchField("degree", "degree");
  metadataMatches += matchField("department", "department");
  metadataMatches += matchField("graduationYear", "graduationYear");

  let score;
  if (hashMatched) {
    matchedFields.unshift("documentHash");
    score = 88 + Math.min(metadataMatches * 2, 8);
    if (payload.blockchainFound) score += 3;
    score += deterministicNumber(seed, 0, 5);
    score = Math.min(99, score);
    audit.push("The uploaded document was converted to a raw-byte SHA-256 fingerprint.");
    audit.push("That fingerprint exactly matched an active issued credential record.");
    audit.push("AI treated the hash match as final proof and used student/course metadata only as supporting context.");
  } else {
    mismatchedFields.unshift("documentHash");
    score = 5 + Math.min(metadataMatches * 3, 12);
    if (originalHash) score += 6;
    if (context.studentEmail) score += 3;
    score += deterministicNumber(seed, 0, 8);
    score = Math.min(39, score);
    riskFactors.unshift("Uploaded SHA-256 fingerprint does not match the trusted issued credential hash.");
    audit.push("The uploaded document was converted to a raw-byte SHA-256 fingerprint.");
    audit.push(originalHash
      ? "A related trusted credential context exists, but its registered hash differs from the uploaded file hash."
      : "No trusted active credential hash was found for this uploaded file.");
    audit.push("AI cannot override the cryptographic mismatch; the final state remains tampered/unverified.");
  }

  const riskLevel = score >= 85 && hashMatched ? "low" : score >= 55 ? "medium" : "high";
  const status = hashMatched ? "authentic" : "tampered";
  const summary = hashMatched
    ? `Live AI Integrity Engine assigns ${score}% confidence (${riskLevel} risk). The cryptographic hash matched the issued credential, with metadata used as supporting evidence.`
    : `Live AI Integrity Engine assigns ${score}% confidence (${riskLevel} risk). The uploaded file hash does not match the trusted issued credential fingerprint, which is strong tamper evidence.`;

  const explanation = hashMatched
    ? [
        "The raw file fingerprint matches the trusted issued record.",
        metadataMatches > 0 ? `${metadataMatches} credential metadata signal(s) support the match.` : "Metadata was limited, so the hash remains the decisive proof.",
        payload.blockchainFound ? "A blockchain proof reference is available for the issued credential." : "Blockchain proof was unavailable in this local response, so backend proof is used for demo continuity.",
      ]
    : [
        "The uploaded file fingerprint differs from the trusted issued record.",
        metadataMatches > 0 ? "Some metadata context may match, but metadata cannot verify an altered file." : "No reliable metadata evidence was available to reduce the risk.",
        "Employer should treat this document as tampered/unverified until the issuer reissues a matching credential.",
      ];

  return {
    status,
    aiIntegrityScore: score,
    integrity_score: score,
    riskLevel,
    aiSummary: summary,
    summary,
    aiExplanation: explanation,
    explanation,
    aiDecisionTrace: audit.concat([`Final AI classification: ${status.toUpperCase()} with ${score}% integrity confidence.`]),
    aiThoughtOutput: audit,
    thoughtOutput: audit,
    matchedFields: [...new Set(matchedFields)],
    mismatchedFields: [...new Set(mismatchedFields)],
    riskFactors: [...new Set(riskFactors)],
    uploadedHash,
    originalHash,
    aiProvider: options.provider || "node-local-risk-engine",
    aiModel: options.model || "deterministic-integrity-engine",
    aiServiceConnected: Boolean(options.serviceConnected),
    llmUsed: false,
    aiSource: options.serviceConnected ? "live-ai-service" : "backend-fallback",
  };
}

async function analyzeWithAiService(payload = {}) {
  const enabled = String(process.env.USE_AI || "false").toLowerCase() === "true";
  const serviceUrl = process.env.AI_SERVICE_URL || "http://localhost:8001";
  const fallback = localAiAnalysis(payload, { serviceConnected: false });

  if (!enabled || typeof fetch !== "function") {
    return {
      ...fallback,
      aiSummary: `${fallback.aiSummary} AI service is disabled, so backend local risk analysis generated this explanation.`,
      aiProvider: "backend-fallback",
      aiModel: "deterministic-integrity-engine",
      aiServiceConnected: false,
      llmUsed: false,
      aiSource: "backend-fallback",
    };
  }

  try {
    const response = await fetch(`${serviceUrl.replace(/\/$/, "")}/analyze-document`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS || 20000)),
    });

    if (!response.ok) {
      throw new Error(`AI service returned HTTP ${response.status}`);
    }

    const ai = await response.json();
    const explanation = safeArray(ai.explanation).length ? safeArray(ai.explanation) : safeArray(ai.aiExplanation);
    const decisionTrace = safeArray(ai.aiDecisionTrace).length
      ? safeArray(ai.aiDecisionTrace)
      : safeArray(ai.thoughtOutput).length
        ? safeArray(ai.thoughtOutput)
        : explanation;

    return {
      ...fallback,
      status: ai.status || fallback.status,
      aiIntegrityScore: Number(ai.aiIntegrityScore ?? ai.integrity_score ?? ai.score ?? fallback.aiIntegrityScore),
      integrity_score: Number(ai.aiIntegrityScore ?? ai.integrity_score ?? ai.score ?? fallback.aiIntegrityScore),
      riskLevel: ai.riskLevel || ai.risk_level || fallback.riskLevel,
      aiSummary: ai.summary || ai.aiSummary || fallback.aiSummary,
      summary: ai.summary || ai.aiSummary || fallback.summary,
      aiExplanation: explanation.length ? explanation : fallback.aiExplanation,
      explanation: explanation.length ? explanation : fallback.explanation,
      aiDecisionTrace: decisionTrace.length ? decisionTrace : fallback.aiDecisionTrace,
      aiThoughtOutput: safeArray(ai.thoughtOutput).length ? safeArray(ai.thoughtOutput) : (decisionTrace.length ? decisionTrace : fallback.aiThoughtOutput),
      thoughtOutput: safeArray(ai.thoughtOutput).length ? safeArray(ai.thoughtOutput) : (decisionTrace.length ? decisionTrace : fallback.thoughtOutput),
      matchedFields: safeArray(ai.matchedFields).length ? safeArray(ai.matchedFields) : fallback.matchedFields,
      mismatchedFields: safeArray(ai.mismatchedFields).length ? safeArray(ai.mismatchedFields) : fallback.mismatchedFields,
      riskFactors: safeArray(ai.riskFactors).length ? safeArray(ai.riskFactors) : fallback.riskFactors,
      uploadedHash: payload.uploadedHash || fallback.uploadedHash,
      originalHash: payload.originalHash || fallback.originalHash,
      aiProvider: ai.aiProvider || ai.provider || "fastapi-ai-service",
      aiModel: ai.aiModel || ai.model || process.env.OLLAMA_MODEL || "llama3.2:1b",
      aiServiceConnected: true,
      llmUsed: ai.llmUsed === true || ai.llm_used === true,
      aiSource: ai.llmUsed === true || ai.llm_used === true ? "ollama-live-ai-service" : "fastapi-rule-engine",
    };
  } catch (error) {
    return {
      ...fallback,
      aiSummary: `${fallback.aiSummary} AI backend service was unavailable (${error.message}); backend fallback generated this explanation.`,
      aiProvider: "backend-fallback",
      aiModel: "deterministic-integrity-engine",
      aiServiceConnected: false,
      llmUsed: false,
      aiSource: "backend-fallback",
      riskFactors: [...(fallback.riskFactors || []), `AI service unavailable: ${error.message}`],
    };
  }
}

module.exports = {
  analyzeWithAiService,
  localAiAnalysis,
  credentialRecordFromRow,
  extractedFieldsFromContext,
};
