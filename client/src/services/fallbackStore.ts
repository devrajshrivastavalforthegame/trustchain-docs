import { env } from "../config/env";
import type { Credential, DashboardStats, TrendPoint, UserRole, VerificationRequest, VerificationResult } from "../types/domain";
import { sha256FromText } from "../utils/hash";

const CREDENTIALS_KEY = "trustchain.fallback.credentials";
const REQUESTS_KEY = "trustchain.fallback.requests";

const assertFallback = (): void => {
  if (!env.enableDemoFallback) {
    throw new Error("Demo fallback is disabled. Start the backend API or set VITE_ENABLE_DEMO_FALLBACK=true for offline testing.");
  }
};

const readJson = <T>(key: string, fallback: T): T => {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("trustchain:fallback-updated"));
};

const seedCredentials = async (): Promise<Credential[]> => {
  const existing = readJson<Credential[] | null>(CREDENTIALS_KEY, null);
  if (existing && existing.length > 0) return existing;
  const hash = await sha256FromText("NIDL-2021-CS-1042-Alex-Jain-BTech-CSE-2026");
  const credential: Credential = {
    id: "cred_alex_jain_btech_2026",
    studentName: "Alex Jain",
    studentEmail: "alex.jain@student.edu",
    enrollmentNumber: "NIDL-2021-CS-1042",
    rollNumber: "21CS1042",
    degreeTitle: "Bachelor of Technology",
    course: "Computer Science and Engineering",
    department: "Computer Science",
    university: "National Institute of Digital Learning",
    graduationYear: "2026",
    documentHash: hash,
    txHash: "0xa91f2a00868f09ea2e4ea91a2d2138d1b82c19dd8991aa89f57dcc5e14b2ed07",
    blockNumber: "49281711",
    gasUsed: "0.00081 POL",
    network: "Polygon Amoy",
    status: "issued",
    fileUrl: "",
    qrUrl: `${env.publicAppUrl}/verify/cred_alex_jain_btech_2026`,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  };
  writeJson(CREDENTIALS_KEY, [credential]);
  return [credential];
};

export const fallbackStore = {
  async login(email: string, role: UserRole): Promise<{ token: string; user: { id: string; name: string; email: string; role: UserRole; organization: string } }> {
    assertFallback();
    const name = email.split("@")[0]?.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "TrustChain User";
    return {
      token: `fallback.jwt.${role}.${Date.now()}`,
      user: {
        id: `${role}_${email}`,
        name,
        email,
        role,
        organization: role === "issuer" ? "National Institute of Digital Learning" : role === "employer" ? "Acme Verification Labs" : "TrustChain Network"
      }
    };
  },
  async issueCredential(input: Partial<Credential>): Promise<Credential> {
    assertFallback();
    const credentials = await seedCredentials();
    const hash = input.documentHash || (await sha256FromText(`${input.enrollmentNumber}-${Date.now()}`));
    const credential: Credential = {
      id: `cred_${hash.slice(0, 12)}`,
      studentName: input.studentName || "Student",
      studentEmail: input.studentEmail || "student@university.edu",
      enrollmentNumber: input.enrollmentNumber || "—",
      rollNumber: input.rollNumber || "—",
      degreeTitle: input.degreeTitle || "Digital Degree",
      course: input.course || "Computer Science and Engineering",
      department: input.department || "Computer Science",
      university: input.university || "National Institute of Digital Learning",
      graduationYear: input.graduationYear || new Date().getFullYear().toString(),
      documentHash: hash,
      txHash: `0x${hash.slice(0, 64)}`,
      blockNumber: String(49280000 + Math.floor(Math.random() * 5000)),
      gasUsed: "0.00078 POL",
      network: "Polygon Amoy",
      status: "issued",
      fileUrl: input.fileUrl || "",
      qrUrl: `${env.publicAppUrl}/verify/cred_${hash.slice(0, 12)}`,
      createdAt: new Date().toISOString()
    };
    const updated = [credential, ...credentials.filter((item) => item.id !== credential.id)];
    writeJson(CREDENTIALS_KEY, updated);
    return credential;
  },
  async listCredentials(email?: string): Promise<Credential[]> {
    assertFallback();
    const credentials = await seedCredentials();
    return email ? credentials.filter((credential) => credential.studentEmail === email || email.includes("registrar")) : credentials;
  },
  async getCredential(id: string): Promise<Credential | undefined> {
    assertFallback();
    const credentials = await seedCredentials();
    return credentials.find((credential) => credential.id === id || credential.enrollmentNumber === id || credential.documentHash === id);
  },
  async createRequest(input: { studentEmail?: string; enrollmentNumber?: string; documentHash?: string; requesterEmail: string; requesterName: string; company: string }): Promise<VerificationRequest> {
    assertFallback();
    const credentials = await seedCredentials();
    const normalizedStudentEmail = String(input.studentEmail || "").trim().toLowerCase();
    if (!normalizedStudentEmail) throw new Error("Student Gmail/email is required to send a verification request.");
    const matched = credentials.find(
      (credential) =>
        credential.studentEmail.toLowerCase() === normalizedStudentEmail &&
        (credential.enrollmentNumber === input.enrollmentNumber ||
          credential.documentHash === input.documentHash ||
          (!input.enrollmentNumber && !input.documentHash))
    );
    const requests = readJson<VerificationRequest[]>(REQUESTS_KEY, []);
    const request: VerificationRequest = {
      id: `req_${Date.now()}`,
      credentialId: matched?.id,
      requesterName: input.requesterName,
      requesterEmail: input.requesterEmail,
      company: input.company,
      studentEmail: normalizedStudentEmail,
      enrollmentNumber: input.enrollmentNumber,
      documentHash: input.documentHash,
      status: "pending",
      createdAt: new Date().toISOString()
    };
    writeJson(REQUESTS_KEY, [request, ...requests]);
    return request;
  },
  async listRequests(email?: string): Promise<VerificationRequest[]> {
    assertFallback();
    await seedCredentials();
    const requests = readJson<VerificationRequest[]>(REQUESTS_KEY, []);
    if (!email) return requests;
    return requests.filter((request) => request.studentEmail === email || request.requesterEmail === email);
  },
  async getRequest(id: string): Promise<VerificationRequest | undefined> {
    assertFallback();
    const requests = readJson<VerificationRequest[]>(REQUESTS_KEY, []);
    return requests.find((request) => request.id === id);
  },
  async resolveRequest(id: string, approved: boolean): Promise<VerificationRequest> {
    assertFallback();
    const requests = readJson<VerificationRequest[]>(REQUESTS_KEY, []);
    const credentials = await seedCredentials();
    const request = requests.find((item) => item.id === id);
    if (!request) throw new Error("Request not found.");
    const credential = credentials.find((item) => item.id === request.credentialId);
    const result: VerificationResult = approved && credential
      ? {
          authentic: true,
          status: "verified",
          studentName: credential.studentName,
          course: credential.course,
          university: credential.university,
          degreeTitle: credential.degreeTitle,
          documentHash: credential.documentHash,
          txHash: credential.txHash,
          blockNumber: credential.blockNumber,
          gasUsed: credential.gasUsed,
          timestamp: new Date().toISOString(),
          aiIntegrityScore: 94,
          riskLevel: "low",
          aiSummary: "AI fallback assigns high confidence because the credential matches the local trusted demo record.",
          aiExplanation: [
            "The credential identifier matched a trusted issued record.",
            "The result is a fallback/demo analysis because the backend AI service was unavailable.",
            "Cryptographic hash matching remains the source of truth in the real backend flow."
          ],
          aiDecisionTrace: [
            "Fallback store found a matching credential record.",
            "The record is treated as low-risk for UI continuity.",
            "Backend verification should be used for final tamper-proof SHA-256 validation."
          ],
          matchedFields: ["documentHash"],
          mismatchedFields: [],
          riskFactors: []
        }
      : {
          authentic: false,
          status: approved ? "tampered" : "rejected",
          documentHash: request.documentHash,
          timestamp: new Date().toISOString(),
          aiIntegrityScore: approved ? 18 : 0,
          riskLevel: approved ? "high" : "medium",
          reason: approved ? "Hash mismatch against blockchain record." : "Student rejected the disclosure request.",
          aiSummary: approved
            ? "AI fallback flags this as high risk because no trusted local credential hash matched the submitted request."
            : "The student rejected disclosure, so no AI integrity decision was required.",
          aiExplanation: approved
            ? [
                "No matching trusted credential was found in the local fallback store.",
                "A hash mismatch is strong tamper evidence.",
                "Use the backend SHA-256 verification route for final proof."
              ]
            : ["Student consent was rejected before document integrity analysis."],
          aiDecisionTrace: approved
            ? ["Fallback verification did not find a matching credential hash.", "The request was marked tampered.", "AI score is explanatory only."]
            : ["Consent rejected by student."],
          matchedFields: [],
          mismatchedFields: approved ? ["documentHash"] : [],
          riskFactors: approved ? ["No trusted fallback credential matched the submitted hash."] : []
        };
    const updatedRequest: VerificationRequest = {
      ...request,
      status: approved ? result.status : "rejected",
      updatedAt: new Date().toISOString(),
      result
    };
    writeJson(REQUESTS_KEY, requests.map((item) => (item.id === id ? updatedRequest : item)));
    return updatedRequest;
  },
  async verifyDirect(input: { id?: string; enrollmentNumber?: string; documentHash?: string }): Promise<VerificationResult> {
    assertFallback();
    const credentials = await seedCredentials();
    const credential = credentials.find(
      (item) => item.id === input.id || item.enrollmentNumber === input.enrollmentNumber || item.documentHash === input.documentHash
    );
    if (!credential) {
      return {
        authentic: false,
        status: "tampered",
        documentHash: input.documentHash,
        timestamp: new Date().toISOString(),
        aiIntegrityScore: 16,
        riskLevel: "high",
        reason: "No blockchain record matched this document hash.",
        aiSummary: "AI fallback flags this document as high risk because no trusted credential record matched the submitted reference.",
        aiExplanation: [
          "No matching trusted credential was found in local fallback storage.",
          "A missing hash match indicates the document may be edited or not issued by the platform.",
          "Backend SHA-256 verification should be used for final confirmation."
        ],
        aiDecisionTrace: ["No matching fallback credential was found.", "The document was classified as tampered.", "AI score is only an explanation layer."],
        matchedFields: [],
        mismatchedFields: ["documentHash"],
        riskFactors: ["No trusted fallback credential matched the submitted hash."]
      };
    }
    return {
      authentic: true,
      status: "verified",
      studentName: credential.studentName,
      course: credential.course,
      university: credential.university,
      degreeTitle: credential.degreeTitle,
      documentHash: credential.documentHash,
      txHash: credential.txHash,
      blockNumber: credential.blockNumber,
      gasUsed: credential.gasUsed,
      timestamp: new Date().toISOString(),
      aiIntegrityScore: 95,
      riskLevel: "low",
      aiSummary: "AI fallback assigns high confidence because the submitted reference matches a trusted demo credential.",
      aiExplanation: [
        "The submitted credential reference matched a trusted local record.",
        "No mismatch was detected in the fallback store.",
        "Backend SHA-256 verification remains the source of truth for production."
      ],
      aiDecisionTrace: ["Fallback store found a matching credential.", "The result was classified as low-risk.", "AI score is explanatory only."],
      matchedFields: ["documentHash"],
      mismatchedFields: [],
      riskFactors: []
    };
  },
  async stats(): Promise<{ stats: DashboardStats; trends: TrendPoint[] }> {
    assertFallback();
    const credentials = await seedCredentials();
    const requests = readJson<VerificationRequest[]>(REQUESTS_KEY, []);
    const tampered = requests.filter((request) => request.status === "tampered").length;
    return {
      stats: {
        documentsUploaded: credentials.length,
        verificationRequests: requests.length,
        tamperedDocuments: tampered,
        blockchainTransactions: credentials.length + requests.filter((request) => request.result?.txHash).length,
        activeIssuers: 3,
        successRate: requests.length ? Math.round(((requests.length - tampered) / requests.length) * 100) : 100
      },
      trends: [
        { name: "Mon", uploads: 7, verifications: 12, tampered: 1 },
        { name: "Tue", uploads: 12, verifications: 18, tampered: 0 },
        { name: "Wed", uploads: 15, verifications: 31, tampered: 2 },
        { name: "Thu", uploads: 19, verifications: 42, tampered: 1 },
        { name: "Fri", uploads: credentials.length + 22, verifications: requests.length + 52, tampered }
      ]
    };
  }
};
