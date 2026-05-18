import {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from "react";
import toast from "react-hot-toast";
import {
  Credential,
  IssueCredentialInput,
  VerificationRequest,
  VerificationResult,
  VerificationSource,
} from "../types/domain";

interface VerificationContextValue {
  credentials: Credential[];
  requests: VerificationRequest[];
  createVerificationRequest: (input: CreateVerificationRequestInput) => VerificationRequest;
  approveRequest: (requestId: string) => void;
  rejectRequest: (requestId: string) => void;
  issueCredential: (input: IssueCredentialInput) => Promise<Credential>;
  getCredentialById: (credentialId: string) => Credential | undefined;
  getCredentialByEnrollment: (enrollmentNo: string) => Credential | undefined;
  resetDemoState: () => void;
}

export interface CreateVerificationRequestInput {
  requesterName: string;
  requesterEmail: string;
  requesterOrganization: string;
  source: VerificationSource;
  submittedHash?: string;
  enrollmentNo?: string;
  fileName?: string;
}

const CREDENTIAL_STORAGE_KEY = "trustchain.credentials";
const REQUEST_STORAGE_KEY = "trustchain.verification.requests";

const alexCredentialHash =
  "f1cf8724ac4a6ad5dbf71e2d96db4e688a9b9f4e9fc91b87ac497d3a0c9d121e";

const initialCredentials: Credential[] = [
  {
    id: "cred_alex_btech_2025",
    studentName: "Alex Jain",
    studentEmail: "alex.jain@student.edu",
    enrollmentNo: "NIDL-2021-CS-1042",
    rollNo: "21CS1042",
    course: "Bachelor of Technology in Computer Science",
    department: "Computer Science & Engineering",
    graduationYear: "2025",
    university: "National Institute of Digital Learning",
    credentialType: "Degree Certificate",
    issuedAt: "2025-06-18T10:30:00.000Z",
    hash: alexCredentialHash,
    status: "verified",
    blockchainTx:
      "0x9e1b31c0f8b85eb01ea5a476a8e11f743822ae1b8bbd44f4c61640236ac487a8",
    blockNumber: 8849021,
    aiIntegrityScore: 98,
  },
];

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const createId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const createMockTxHash = (seed: string) =>
  `0x${Array.from({ length: 64 }, (_, index) => {
    const code = seed.charCodeAt(index % Math.max(seed.length, 1));
    return ((code + index * 5 + 3) % 16).toString(16);
  }).join("")}`;

const createResult = (
  request: VerificationRequest,
  credential: Credential | undefined,
): VerificationResult => {
  if (!credential) {
    return {
      outcome: "tampered",
      timestamp: new Date().toISOString(),
      message:
        "The submitted credential hash or enrollment record does not match any registered blockchain credential.",
    };
  }

  const exactHashMatch = request.submittedHash === credential.hash;
  const enrollmentRequest = request.source === "enrollment";

  if (exactHashMatch || enrollmentRequest) {
    return {
      outcome: "authentic",
      credential,
      txHash: credential.blockchainTx,
      blockNumber: credential.blockNumber,
      timestamp: new Date().toISOString(),
      aiIntegrityScore: credential.aiIntegrityScore,
      message:
        "Student consent was approved and the credential matches the blockchain anchor.",
    };
  }

  return {
    outcome: "tampered",
    credential,
    txHash: createMockTxHash(request.submittedHash),
    blockNumber: credential.blockNumber + 27,
    timestamp: new Date().toISOString(),
    aiIntegrityScore: 24,
    message:
      "Student consent was approved, but the submitted document hash differs from the registered credential hash.",
  };
};

export const VerificationContext = createContext<VerificationContextValue | null>(null);

export const VerificationProvider = ({ children }: PropsWithChildren) => {
  const [credentials, setCredentials] = useState<Credential[]>(() =>
    safeParse(window.localStorage.getItem(CREDENTIAL_STORAGE_KEY), initialCredentials),
  );
  const [requests, setRequests] = useState<VerificationRequest[]>(() =>
    safeParse(window.localStorage.getItem(REQUEST_STORAGE_KEY), []),
  );

  const persistCredentials = (nextCredentials: Credential[]) => {
    setCredentials(nextCredentials);
    window.localStorage.setItem(CREDENTIAL_STORAGE_KEY, JSON.stringify(nextCredentials));
  };

  const persistRequests = (nextRequests: VerificationRequest[]) => {
    setRequests(nextRequests);
    window.localStorage.setItem(REQUEST_STORAGE_KEY, JSON.stringify(nextRequests));
  };

  const getCredentialById = (credentialId: string) =>
    credentials.find((credential) => credential.id === credentialId);

  const getCredentialByEnrollment = (enrollmentNo: string) =>
    credentials.find(
      (credential) =>
        credential.enrollmentNo.toLowerCase() === enrollmentNo.trim().toLowerCase(),
    );

  const createVerificationRequest = (input: CreateVerificationRequestInput) => {
    const matchedCredential =
      input.source === "enrollment" && input.enrollmentNo
        ? getCredentialByEnrollment(input.enrollmentNo)
        : credentials.find(
            (credential) =>
              credential.hash.toLowerCase() === input.submittedHash?.trim().toLowerCase(),
          );

    const request: VerificationRequest = {
      id: createId("vr"),
      requesterName: input.requesterName,
      requesterEmail: input.requesterEmail,
      requesterOrganization: input.requesterOrganization,
      studentEmail: matchedCredential?.studentEmail ?? "alex.jain@student.edu",
      enrollmentNo: input.enrollmentNo ?? matchedCredential?.enrollmentNo,
      submittedHash: input.submittedHash?.trim() ?? matchedCredential?.hash ?? "unregistered-hash",
      fileName: input.fileName,
      source: input.source,
      status: "pending",
      createdAt: new Date().toISOString(),
      matchedCredentialId: matchedCredential?.id,
    };

    persistRequests([request, ...requests]);
    toast.success("Verification request sent to the student");
    return request;
  };

  const approveRequest = (requestId: string) => {
    const nextRequests = requests.map((request) => {
      if (request.id !== requestId) return request;

      const credential = request.matchedCredentialId
        ? getCredentialById(request.matchedCredentialId)
        : credentials.find(
            (item) => item.hash.toLowerCase() === request.submittedHash.toLowerCase(),
          );

      return {
        ...request,
        status: "approved" as const,
        reviewedAt: new Date().toISOString(),
        result: createResult(request, credential),
      };
    });

    persistRequests(nextRequests);
    toast.success("Request approved. Employer result unlocked.");
  };

  const rejectRequest = (requestId: string) => {
    const nextRequests = requests.map((request) => {
      if (request.id !== requestId) return request;

      return {
        ...request,
        status: "rejected" as const,
        reviewedAt: new Date().toISOString(),
        result: {
          outcome: "rejected" as const,
          timestamp: new Date().toISOString(),
          message: "The student rejected this consent request.",
        },
      };
    });

    persistRequests(nextRequests);
    toast.error("Request rejected");
  };

  const issueCredential = async (input: IssueCredentialInput) => {
    await new Promise((resolve) => window.setTimeout(resolve, 700));

    const credential: Credential = {
      id: createId("cred"),
      studentName: input.studentName,
      studentEmail: input.studentEmail,
      enrollmentNo: input.enrollmentNo,
      rollNo: input.rollNo,
      course: input.course,
      department: input.department,
      graduationYear: input.graduationYear,
      university: "National Institute of Digital Learning",
      credentialType: input.credentialType,
      issuedAt: new Date().toISOString(),
      hash: input.hash,
      status: "verified",
      blockchainTx: createMockTxHash(input.hash),
      blockNumber: 8921400 + Math.floor(Math.random() * 5000),
      aiIntegrityScore: 96 + Math.floor(Math.random() * 4),
    };

    persistCredentials([credential, ...credentials]);
    toast.success("Credential anchored on demo blockchain");
    return credential;
  };

  const resetDemoState = () => {
    persistCredentials(initialCredentials);
    persistRequests([]);
    toast.success("Demo state reset");
  };

  const value = useMemo<VerificationContextValue>(
    () => ({
      credentials,
      requests,
      createVerificationRequest,
      approveRequest,
      rejectRequest,
      issueCredential,
      getCredentialById,
      getCredentialByEnrollment,
      resetDemoState,
    }),
    [credentials, requests],
  );

  return (
    <VerificationContext.Provider value={value}>
      {children}
    </VerificationContext.Provider>
  );
};

export const useVerification = () => {
  const context = useContext(VerificationContext);

  if (!context) {
    throw new Error("useVerification must be used inside VerificationProvider.");
  }

  return context;
};
