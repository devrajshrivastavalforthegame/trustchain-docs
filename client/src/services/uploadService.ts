import { api } from "./api";
import { fallbackStore } from "./fallbackStore";
import { normalizeCredential } from "./normalizers";
import { env } from "../config/env";
import type { Credential } from "../types/domain";
import { encryptFileForApi } from "./apiWrapper";

export interface IssueCredentialInput {
  studentName: string;
  enrollmentNumber: string;
  rollNumber: string;
  studentEmail: string;
  degreeTitle: string;
  course: string;
  department: string;
  graduationYear: string;
  documentHash: string;
  file?: File;
}


export interface ReissueCredentialInput extends IssueCredentialInput {
  documentId: string;
  reason: string;
}

export const uploadService = {

  async issueCredential(
    input: IssueCredentialInput
  ): Promise<Credential> {

    const formData =
      new FormData();

    formData.append(
      "studentName",
      input.studentName
    );

    formData.append(
      "enrollmentNumber",
      input.enrollmentNumber
    );

    formData.append(
      "rollNumber",
      input.rollNumber
    );

    formData.append(
      "studentEmail",
      input.studentEmail
    );

    formData.append(
      "degreeTitle",
      input.degreeTitle
    );

    formData.append(
      "course",
      input.course
    );

    formData.append(
      "department",
      input.department
    );

    formData.append(
      "graduationYear",
      input.graduationYear
    );

    formData.append(
      "documentHash",
      input.documentHash
    );

    // IMPORTANT
    if (input.file) {
      if (env.useApiWrapperEncryption) {
        const encrypted = await encryptFileForApi(input.file);
        formData.append("document", encrypted.encryptedFile);
        formData.append("apiFileEncryption", encrypted.metadata);
      } else {
        formData.append("document", input.file);
      }
    }

    try {

      const payload =
        await api.post<unknown>(
          "/issuer/upload",
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data"
            }
          }
        );

      return normalizeCredential(
        payload
      );

    } catch (error) {

      if (
        !env.enableDemoFallback
      ) {

        throw error;

      }

      return fallbackStore
        .issueCredential(input);

    }

  },


async reissueCredential(input: ReissueCredentialInput): Promise<Credential> {
  const formData = new FormData();
  formData.append("studentName", input.studentName);
  formData.append("enrollmentNumber", input.enrollmentNumber);
  formData.append("rollNumber", input.rollNumber);
  formData.append("studentEmail", input.studentEmail);
  formData.append("degreeTitle", input.degreeTitle);
  formData.append("course", input.course);
  formData.append("department", input.department);
  formData.append("graduationYear", input.graduationYear);
  formData.append("documentHash", input.documentHash);
  formData.append("reason", input.reason);
  if (input.file) {
    if (env.useApiWrapperEncryption) {
      const encrypted = await encryptFileForApi(input.file);
      formData.append("document", encrypted.encryptedFile);
      formData.append("apiFileEncryption", encrypted.metadata);
    } else {
      formData.append("document", input.file);
    }
  }
  const payload = await api.post<unknown>(`/issuer/reissue/${encodeURIComponent(input.documentId)}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
  return normalizeCredential(payload);
},

  // FIXED
  async listCredentials(
    studentEmail?: string
  ): Promise<Credential[]> {

    try {

      const payload =
        await api.get<unknown>(
          studentEmail
            ? `/issuer/history?studentEmail=${encodeURIComponent(studentEmail)}`
            : "/issuer/history"
        );

      const source =
        Array.isArray(payload)
          ? payload
          : (payload as any).history || [];

      return source.map(
        normalizeCredential
      );

    } catch (error) {

      if (
        !env.enableDemoFallback
      ) {

        throw error;

      }

      return fallbackStore
        .listCredentials(
          studentEmail
        );

    }

  },

  // FIXED
  async getCredential(
    id: string
  ): Promise<Credential> {

    try {

      const payload =
        await api.get<unknown>(
          `/issuer/history`
        );

      const source =
        Array.isArray(payload)
          ? payload
          : (payload as any).history || [];

      const credential =
        source.find(
          (item: any) =>
            String(item.id) === id
        );

      return normalizeCredential(
        credential
      );

    } catch (error) {

      if (
        !env.enableDemoFallback
      ) {

        throw error;

      }

      const credential =
        await fallbackStore
          .getCredential(id);

      if (!credential)
        throw error;

      return credential;

    }

  }

};