import { api } from "./api";
import { isRecord } from "../utils/typeGuards";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "active" | string;

export interface PendingUser {
  id: number | string;
  name: string;
  email: string;
  role: string;
  status: ApprovalStatus;
  organization?: string;
  created_at?: string;
  createdAt?: string;
}

const normalizePendingUser = (item: unknown): PendingUser => {
  const source = isRecord(item) ? item : {};
  return {
    id: typeof source.id === "number" || typeof source.id === "string" ? source.id : "",
    name: typeof source.name === "string" ? source.name : "Unknown user",
    email: typeof source.email === "string" ? source.email : "unknown@trustchain.local",
    role: typeof source.role === "string" ? source.role : "unknown",
    status: typeof source.status === "string" ? source.status : "pending",
    organization: typeof source.organization === "string" ? source.organization : undefined,
    created_at: typeof source.created_at === "string" ? source.created_at : undefined,
    createdAt: typeof source.createdAt === "string" ? source.createdAt : undefined,
  };
};

const extractUsers = (payload: unknown): PendingUser[] => {
  if (Array.isArray(payload)) return payload.map(normalizePendingUser);
  if (!isRecord(payload)) return [];

  const candidates = [payload.users, payload.pendingUsers, payload.data, payload.result];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.map(normalizePendingUser);
    if (isRecord(candidate) && Array.isArray(candidate.users)) return candidate.users.map(normalizePendingUser);
  }

  return [];
};

export const adminApprovalService = {
  async listPendingUsers(): Promise<PendingUser[]> {
    const payload = await api.get<unknown>("/admin/users/pending");
    return extractUsers(payload);
  },

  async approveUser(userId: number | string): Promise<void> {
    await api.patch(`/admin/users/${userId}/approve`);
  },

  async rejectUser(userId: number | string): Promise<void> {
    await api.patch(`/admin/users/${userId}/reject`);
  },
};
