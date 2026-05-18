import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from "axios";
import { env } from "../config/env";
import { storage } from "../utils/storage";
import { unwrapApiData, isRecord } from "../utils/typeGuards";
import { decryptEnvelope, encryptEnvelope } from "./apiWrapper";

export class ApiError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 18000,
  headers: {
    Accept: "application/json"
  }
});

apiClient.interceptors.request.use((config) => {
  const token = storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const getErrorMessage = (error: AxiosError): string => {
  const responseData = error.response?.data;
  if (isRecord(responseData)) {
    const message = responseData.message ?? responseData.error ?? responseData.detail;
    if (typeof message === "string") return message;
  }
  if (error.code === "ECONNABORTED") return "The backend took too long to respond.";
  if (error.message === "Network Error") return "Cannot reach backend API. Start your backend on http://localhost:5000/api.";
  return error.message || "Request failed.";
};

export const api = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = env.useApiWrapperEncryption
        ? await apiClient.post("/wrapped", await encryptEnvelope({ method: "GET", path: url, body: null }))
        : await apiClient.get(url, config);
      const data = await decryptEnvelope<unknown>(response.data);
      return unwrapApiData(data) as T;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new ApiError(getErrorMessage(axiosError), axiosError.response?.status, axiosError.response?.data);
    }
  },
  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const isMultipart = typeof FormData !== "undefined" && data instanceof FormData;
      const response = env.useApiWrapperEncryption && !isMultipart
        ? await apiClient.post("/wrapped", await encryptEnvelope({ method: "POST", path: url, body: data || {} }))
        : await apiClient.post(url, data, config);
      const unwrapped = await decryptEnvelope<unknown>(response.data);
      return unwrapApiData(unwrapped) as T;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new ApiError(getErrorMessage(axiosError), axiosError.response?.status, axiosError.response?.data);
    }
  },
  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = env.useApiWrapperEncryption
        ? await apiClient.post("/wrapped", await encryptEnvelope({ method: "PATCH", path: url, body: data || {} }))
        : await apiClient.patch(url, data, config);
      const unwrapped = await decryptEnvelope<unknown>(response.data);
      return unwrapApiData(unwrapped) as T;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new ApiError(getErrorMessage(axiosError), axiosError.response?.status, axiosError.response?.data);
    }
  }
};

export const pingBackend = async (): Promise<boolean> => {
  try {
    await apiClient.get("/health", { timeout: 3000 });
    return true;
  } catch {
    try {
      await apiClient.get("/", { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
};
