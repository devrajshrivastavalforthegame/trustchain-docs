import { api } from "./api";
import { fallbackStore } from "./fallbackStore";
import { normalizeVerificationRequest, normalizeVerificationResult } from "./normalizers";
import { env } from "../config/env";
import { encryptFileForApi } from "./apiWrapper";
import type { VerificationRequest, VerificationResult } from "../types/domain";

export interface VerificationRequestInput {

  /** Required: verification consent is routed by the student's Gmail/email. */
  studentEmail: string;

  /** Optional: used only as supporting metadata, not as the routing identity. */
  enrollmentNumber?: string;

  /** Optional: used for tamper-proof hash comparison after approval. */
  documentHash?: string;

  requesterEmail: string;

  requesterName: string;

  company: string;

}

export interface VerifyInput {
  id?: string;
  enrollmentNumber?: string;
  documentHash?: string;
  file?: File;
  studentEmail?: string;
}

export const verificationService = {
  async requestVerification(input: VerificationRequestInput): Promise<VerificationRequest> {
    try {
      const payload = await api.post<unknown>("/verification/request", input);
      return normalizeVerificationRequest(payload);
    } catch (error) {
      if (!env.enableDemoFallback) throw error;
      return fallbackStore.createRequest(input as any);
    }
  },
  async verify(input: VerifyInput): Promise<VerificationResult> {
    try {
      let payload: unknown;

      if (input.file) {
        const formData = new FormData();
        if (env.useApiWrapperEncryption) {
          const encrypted = await encryptFileForApi(input.file);
          formData.append("document", encrypted.encryptedFile);
          formData.append("apiFileEncryption", encrypted.metadata);
        } else {
          formData.append("document", input.file);
        }
        if (input.documentHash) formData.append("documentHash", input.documentHash);
        if (input.enrollmentNumber) formData.append("enrollmentNumber", input.enrollmentNumber);
        if (input.studentEmail) formData.append("studentEmail", input.studentEmail);
        payload = await api.post<unknown>("/verification/verify", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        payload = await api.post<unknown>("/verification/verify", input);
      }

      return normalizeVerificationResult(payload);
    } catch (error) {
      if (!env.enableDemoFallback) throw error;
      return fallbackStore.verifyDirect(input);
    }
  },
  async publicVerify(id: string): Promise<VerificationResult> {
    try {
      const payload = await api.get<unknown>(`/verification/verify?id=${encodeURIComponent(id)}`);
      return normalizeVerificationResult(payload);
    } catch (error) {
      if (!env.enableDemoFallback) throw error;
      return fallbackStore.verifyDirect({ id });
    }
  },
  async listRequests(
  email?: string
): Promise<VerificationRequest[]> {

  try {

    const query =
      email
        ? `?email=${encodeURIComponent(email)}`
        : "";

    const payload =
      await api.get<unknown>(
        `/verification/request${query}`
      );

    const source =
      Array.isArray(payload)
        ? payload
        : [];

    return source.map(
      normalizeVerificationRequest
    );

  } catch (error) {

    if (
      !env.enableDemoFallback
    ) {

      throw error;

    }

    return fallbackStore
      .listRequests(email);

  }

},
  async getRequest(id: string): Promise<VerificationRequest> {
    try {
      const payload = await api.get<unknown>(`/verification/request/${encodeURIComponent(id)}`);
      return normalizeVerificationRequest(payload);
    } catch (error) {
      if (!env.enableDemoFallback) throw error;
      const request = await fallbackStore.getRequest(id);
      if (!request) throw error;
      return request;
    }
  },
  async resolveRequest(
  id: string,
  approved: boolean
): Promise<VerificationRequest> {

  try {

    const payload =
      await api.patch<unknown>(
        `/verification/request/${encodeURIComponent(id)}`,
        {
          status:
            approved
              ? "approved"
              : "rejected",
        }
      );

    return normalizeVerificationRequest(
      payload
    );

  } catch (error) {

    if (
      !env.enableDemoFallback
    ) {

      throw error;

    }

    return fallbackStore
      .resolveRequest(
        id,
        approved
      );

  }

},
};
