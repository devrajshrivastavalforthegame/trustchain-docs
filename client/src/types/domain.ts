export type UserRole = "issuer" | "student" | "employer" | "developer" | "admin";
export type AccountStatus = "pending" | "approved" | "rejected" | "active" | string;

export type CredentialStatus = "issued" | "verified" | "pending" | "tampered" | "revoked" | "reissued" | "superseded" | "active";
export type VerificationStatus = "pending" | "approved" | "rejected" | "verified" | "tampered" | "expired";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization?: string;
  walletAddress?: string;
  status?: AccountStatus;
}

export interface Credential {
  id: string;
  studentName: string;
  studentEmail: string;
  enrollmentNumber: string;
  rollNumber: string;
  degreeTitle: string;
  course: string;
  department: string;
  university: string;
  graduationYear: string;
  documentHash: string;
  txHash: string;
  blockNumber?: string;
  gasUsed?: string;
  network?: string;
  status: CredentialStatus;
  fileUrl?: string;
  qrUrl?: string;
  createdAt: string;
  updatedAt?: string;
  version?: number;
  previousDocumentId?: string;
  reissueReason?: string;
  signedDownloadUrl?: string;
}

export interface VerificationResult {
  authentic: boolean;
  status: "verified" | "tampered" | "rejected" | "pending";
  studentName?: string;
  course?: string;
  university?: string;
  degreeTitle?: string;
  documentHash?: string;
  txHash?: string;
  blockNumber?: string;
  gasUsed?: string;
  timestamp?: string;
  aiIntegrityScore?: number;
  riskLevel?: "low" | "medium" | "high" | string;
  aiSummary?: string;
  aiExplanation?: string[];
  aiDecisionTrace?: string[];
  aiThoughtOutput?: string[];
  riskFactors?: string[];
  matchedFields?: string[];
  mismatchedFields?: string[];
  uploadedHash?: string;
  originalHash?: string;
  aiProvider?: string;
  aiModel?: string;
  aiServiceConnected?: boolean;
  aiSource?: string;
  llmUsed?: boolean;
  reason?: string;
}

export interface VerificationRequest {
  id: string;
  credentialId?: string;
  requesterName: string;
  requesterEmail: string;
  company: string;
  studentEmail?: string;
  enrollmentNumber?: string;
  documentHash?: string;
  status: VerificationStatus;
  createdAt: string;
  updatedAt?: string;
  result?: VerificationResult;
}

export interface BlockchainReceipt {
  txHash: string;
  blockNumber: string;
  gasUsed: string;
  network: string;
  timestamp: string;
}

export interface DashboardStats {
  documentsUploaded: number;
  verificationRequests: number;
  tamperedDocuments: number;
  blockchainTransactions: number;
  activeIssuers: number;
  successRate: number;
}

export interface TrendPoint {
  name: string;
  uploads: number;
  verifications: number;
  tampered: number;
}

export interface ApiMode {
  online: boolean;
  fallback: boolean;
  lastCheckedAt?: string;
}
export interface DemoAccount {
  role: string;
  label: string;
  email: string;
  password: string;
  name: string;
  organization?: string;
}