import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { uploadService, type IssueCredentialInput, type ReissueCredentialInput } from "../services/uploadService";
import { verificationService, type VerificationRequestInput, type VerifyInput } from "../services/verificationService";
import type { Credential, VerificationRequest, VerificationResult } from "../types/domain";
import { env } from "../config/env";
import { useAuth } from "./AuthContext";

interface TrustChainContextValue {
  credentials: Credential[];
  requests: VerificationRequest[];
  loading: boolean;
  error: string;
  refreshAll: () => Promise<void>;
  issueCredential: (input: IssueCredentialInput) => Promise<Credential>;
  reissueCredential: (input: ReissueCredentialInput) => Promise<Credential>;
  requestVerification: (input: VerificationRequestInput) => Promise<VerificationRequest>;
  verify: (input: VerifyInput) => Promise<VerificationResult>;
  resolveRequest: (id: string, approved: boolean) => Promise<VerificationRequest>;
}

const TrustChainContext = createContext<TrustChainContextValue | undefined>(undefined);

export const TrustChainProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [nextCredentials, nextRequests] = await Promise.all([
        uploadService.listCredentials(user.role === "student" ? user.email : undefined),
        verificationService.listRequests(user.role === "student"? user.email: undefined)
      ]);
      setCredentials(nextCredentials);
      setRequests(nextRequests);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to sync with backend.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => void refreshAll(), env.pollingIntervalMs);
    const onFallbackUpdate = () => void refreshAll();
    window.addEventListener("trustchain:fallback-updated", onFallbackUpdate);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("trustchain:fallback-updated", onFallbackUpdate);
    };
  }, [refreshAll, user]);

  const issueCredential = async (input: IssueCredentialInput) => {
    const credential = await uploadService.issueCredential(input);
    setCredentials((current) => [credential, ...current.filter((item) => item.id !== credential.id)]);
    toast.success("Degree anchored to blockchain.");
    return credential;
  };

  const reissueCredential = async (input: ReissueCredentialInput) => {
    const credential = await uploadService.reissueCredential(input);
    setCredentials((current) => [credential, ...current.map((item) => item.id === input.documentId ? { ...item, status: "superseded" as const } : item)]);
    toast.success("Credential reissued. Old version preserved as superseded.");
    return credential;
  };

  const requestVerification = async (input: VerificationRequestInput) => {
    const request = await verificationService.requestVerification(input);
    setRequests((current) => [request, ...current.filter((item) => item.id !== request.id)]);
    toast.success("Consent request sent to student.");
    return request;
  };

  const verify = async (input: VerifyInput) => verificationService.verify(input);

  const resolveRequest = async (id: string, approved: boolean) => {
    const request = await verificationService.resolveRequest(id, approved);
    setRequests((current) => current.map((item) => (item.id === id ? request : item)));
    toast.success(approved ? "Request approved." : "Request rejected.");
    return request;
  };

  const value = useMemo(
    () => ({ credentials, requests, loading, error, refreshAll, issueCredential, reissueCredential, requestVerification, verify, resolveRequest }),
    [credentials, requests, loading, error, refreshAll]
  );

  return <TrustChainContext.Provider value={value}>{children}</TrustChainContext.Provider>;
};

export const useTrustChain = () => {
  const value = useContext(TrustChainContext);
  if (!value) throw new Error("useTrustChain must be used inside TrustChainProvider.");
  return value;
};
