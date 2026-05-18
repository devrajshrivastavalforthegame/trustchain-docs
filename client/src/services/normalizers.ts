import type {
  Credential,
  DashboardStats,
  TrendPoint,
  User,
  UserRole,
  VerificationRequest,
  VerificationResult
} from "../types/domain";
import { env } from "../config/env";
import { isRecord, readNumber, readString, readRecord } from "../utils/typeGuards";

const now = () => new Date().toISOString();

const roleFromValue = (value: unknown): UserRole => {
  const role = typeof value === "string" ? value.toLowerCase() : "student";
  if (["issuer", "student", "employer", "developer", "admin"].includes(role)) return role as UserRole;
  return "student";
};

const mergeRecords = (...records: Array<Record<string, unknown> | undefined>): Record<string, unknown> =>
  Object.assign({}, ...records.filter(Boolean));

export const normalizeUser = (payload: unknown, fallbackRole: UserRole = "student"): User => {
  const source = isRecord(payload) ? payload : {};
  const userSource = readRecord(source, ["user", "account", "profile"]) ?? source;
  const email = readString(userSource, ["email", "userEmail"], "unknown@trustchain.local");
  return {
    id: readString(userSource, ["id", "_id", "userId"], email),
    name: readString(userSource, ["name", "fullName", "username"], email.split("@")[0] || "TrustChain User"),
    email,
    role: roleFromValue(userSource.role ?? source.role ?? fallbackRole),
    organization: readString(userSource, ["organization", "company", "institution", "university"], ""),
    walletAddress: readString(userSource, ["walletAddress", "wallet"], ""),
    status: readString(userSource, ["status", "approval_status", "accountStatus"], readString(source, ["status"], ""))
  };
};

export const normalizeAuth = (payload: unknown, fallbackRole: UserRole): { token: string; user: User; requiresApproval?: boolean; message?: string } => {
  const source = isRecord(payload) ? payload : {};
  const token = readString(source, ["token", "accessToken", "jwt"], "");
  const requiresApproval = source.requiresApproval === true || readString(source, ["status"], "") === "pending";
  const message = readString(source, ["message"], "");
  return { token, user: normalizeUser(payload, fallbackRole), requiresApproval, message };
};

export const normalizeCredential = (payload: unknown): Credential => {
  const source = isRecord(payload) ? payload : {};
  const credentialSource = mergeRecords(
    source,
    readRecord(source, ["student"]),
    readRecord(source, ["document"]),
    readRecord(source, ["degree"]),
    readRecord(source, ["credential"])
  );

  const id = readString(credentialSource, ["id", "_id", "credentialId", "documentId"], crypto.randomUUID());
  const hash = readString(credentialSource, ["documentHash", "hash", "fileHash", "file_hash", "degreeHash"], "");
  const txHash = readString(credentialSource, ["txHash", "tx_hash", "polygon_tx", "transactionHash", "blockchainTx"], "");

  return {
    id,
    studentName: readString(credentialSource, ["studentName", "student_name", "name", "fullName"], "Student"),
    studentEmail: readString(credentialSource, ["studentEmail", "student_email", "email"], "student@university.edu"),
    enrollmentNumber: readString(credentialSource, ["enrollmentNumber", "enrollmentNo", "enrollment_no", "enrollment"], "—"),
    rollNumber: readString(credentialSource, ["rollNumber", "rollNo", "roll_no"], "—"),
    degreeTitle: readString(credentialSource, ["degreeTitle", "degree_title", "degree", "type"], "Bachelor of Technology"),
    course: readString(credentialSource, ["course", "program"], "Computer Science and Engineering"),
    department: readString(credentialSource, ["department", "dept"], "Computer Science"),
    university: readString(credentialSource, ["university", "issuer", "institution"], "National Institute of Digital Learning"),
    graduationYear: readString(credentialSource, ["graduationYear", "graduation_year", "year", "passingYear"], "2026"),
    documentHash: hash,
    txHash,
    blockNumber: readString(credentialSource, ["blockNumber", "block_number", "block"], ""),
    gasUsed: readString(credentialSource, ["gasUsed", "gas_used", "gas"], ""),
    network: readString(credentialSource, ["network", "chain"], "Polygon Amoy"),
    status: readString(credentialSource, ["status"], "issued") as Credential["status"],
    fileUrl: readString(credentialSource, ["fileUrl", "file_url", "documentUrl", "degreeUrl"], ""),
    qrUrl: readString(credentialSource, ["qrUrl", "qr_url"], `${env.publicAppUrl}/verify/${id}`),
    createdAt: readString(credentialSource, ["createdAt", "created_at", "timestamp", "issuedAt"], now()),
    updatedAt: readString(credentialSource, ["updatedAt", "updated_at"], "")
  };
};

export const normalizeVerificationResult = (payload: unknown): VerificationResult => {
  const source = isRecord(payload) ? payload : {};
  const resultSource = readRecord(source, ["verification", "result", "data"]) ?? source;
  const rawStatus = readString(resultSource, ["status"], source.verified === false ? "tampered" : "pending").toLowerCase();
  const authentic = resultSource.authentic === true || resultSource.verified === true || rawStatus === "verified" || rawStatus === "authentic";
  const status = rawStatus.includes("tamper") ? "tampered" : authentic ? "verified" : rawStatus === "rejected" ? "rejected" : "pending";

  return {
    authentic,
    status,
    studentName: readString(resultSource, ["studentName", "student_name", "name"], ""),
    course: readString(resultSource, ["course", "program"], ""),
    university: readString(resultSource, ["university", "institution"], ""),
    degreeTitle: readString(resultSource, ["degreeTitle", "degree_title", "degree"], ""),
    documentHash: readString(resultSource, ["documentHash", "file_hash", "hash"], ""),
    txHash: readString(resultSource, ["txHash", "tx_hash", "polygon_tx", "transactionHash", "blockchainTx"], ""),
    blockNumber: readString(resultSource, ["blockNumber", "block_number", "block"], ""),
    gasUsed: readString(resultSource, ["gasUsed", "gas_used", "gas"], ""),
    timestamp: readString(resultSource, ["timestamp", "verifiedAt", "createdAt", "created_at"], now()),
    aiIntegrityScore: readNumber(resultSource, ["aiIntegrityScore", "integrityScore", "integrity_score", "score"], authentic ? 98 : 12),
    riskLevel: readString(resultSource, ["riskLevel", "risk_level"], authentic ? "low" : "high"),
    aiSummary: readString(resultSource, ["aiSummary", "summary"], ""),
    aiExplanation: Array.isArray(resultSource.aiExplanation)
      ? resultSource.aiExplanation.filter((item): item is string => typeof item === "string")
      : Array.isArray(resultSource.explanation)
        ? resultSource.explanation.filter((item): item is string => typeof item === "string")
        : [],
    aiDecisionTrace: Array.isArray(resultSource.aiDecisionTrace)
      ? resultSource.aiDecisionTrace.filter((item): item is string => typeof item === "string")
      : Array.isArray(resultSource.thoughtOutput)
        ? resultSource.thoughtOutput.filter((item): item is string => typeof item === "string")
        : [],
    aiThoughtOutput: Array.isArray(resultSource.aiThoughtOutput)
      ? resultSource.aiThoughtOutput.filter((item): item is string => typeof item === "string")
      : Array.isArray(resultSource.thoughtOutput)
        ? resultSource.thoughtOutput.filter((item): item is string => typeof item === "string")
        : [],
    riskFactors: Array.isArray(resultSource.riskFactors)
      ? resultSource.riskFactors.filter((item): item is string => typeof item === "string")
      : [],
    matchedFields: Array.isArray(resultSource.matchedFields)
      ? resultSource.matchedFields.filter((item): item is string => typeof item === "string")
      : [],
    mismatchedFields: Array.isArray(resultSource.mismatchedFields)
      ? resultSource.mismatchedFields.filter((item): item is string => typeof item === "string")
      : [],
    uploadedHash: readString(resultSource, ["uploadedHash", "uploaded_hash"], ""),
    originalHash: readString(resultSource, ["originalHash", "original_hash"], ""),
    aiProvider: readString(resultSource, ["aiProvider", "provider"], ""),
    aiModel: readString(resultSource, ["aiModel", "model"], ""),
    aiServiceConnected: resultSource.aiServiceConnected === true,
    aiSource: readString(resultSource, ["aiSource", "mode"], ""),
    llmUsed: resultSource.llmUsed === true,
    reason: readString(resultSource, ["reason", "message"], "")
  };
};

export const normalizeVerificationRequest = (payload: unknown): VerificationRequest => {
  const source = isRecord(payload) ? payload : {};
  const requestSource = readRecord(source, ["request", "verificationRequest"]) ?? source;
  const id = readString(requestSource, ["id", "_id", "requestId"], crypto.randomUUID());
  const resultValue = requestSource.result ?? requestSource.verification ?? requestSource.response;

  return {
    id,
    credentialId: readString(requestSource, ["credentialId", "documentId", "credential_id", "document_id"], ""),
    requesterName: readString(requestSource, ["requesterName", "requester_name", "employerName", "name"], "Employer"),
    requesterEmail: readString(requestSource, ["requesterEmail", "requester_email", "employerEmail", "email"], "verify@company.com"),
    company: readString(requestSource, ["company", "organization", "requesterCompany"], "Hiring Company"),
    studentEmail: readString(requestSource, ["studentEmail", "student_email"], ""),
    enrollmentNumber: readString(requestSource, ["enrollmentNumber", "enrollmentNo", "enrollment_no"], ""),
    documentHash: readString(requestSource, ["documentHash", "file_hash", "hash"], ""),
    status: readString(requestSource, ["status"], "pending") as VerificationRequest["status"],
    createdAt: readString(requestSource, ["createdAt", "created_at", "timestamp"], now()),
    updatedAt: readString(requestSource, ["updatedAt", "updated_at"], ""),
    result: resultValue ? normalizeVerificationResult(resultValue) : undefined
  };
};

export const normalizeStats = (payload: unknown): DashboardStats => {
  const source = isRecord(payload) ? payload : {};
  return {
    documentsUploaded: readNumber(source, ["documentsUploaded", "totalUploads", "uploads"], 0),
    verificationRequests: readNumber(source, ["verificationRequests", "totalVerifications", "verifications"], 0),
    tamperedDocuments: readNumber(source, ["tamperedDocuments", "tamperAlerts", "tampered"], 0),
    blockchainTransactions: readNumber(source, ["blockchainTransactions", "transactions", "txCount"], 0),
    activeIssuers: readNumber(source, ["activeIssuers", "issuers"], 0),
    successRate: readNumber(source, ["successRate"], 98)
  };
};

export const normalizeTrendPoint = (payload: unknown): TrendPoint => {
  const source = isRecord(payload) ? payload : {};
  return {
    name: readString(source, ["name", "day", "date"], "Now"),
    uploads: readNumber(source, ["uploads", "documentsUploaded"], 0),
    verifications: readNumber(source, ["verifications", "verificationRequests"], 0),
    tampered: readNumber(source, ["tampered", "tamperedDocuments"], 0)
  };
};
