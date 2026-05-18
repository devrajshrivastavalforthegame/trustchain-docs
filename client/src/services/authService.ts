import { api } from "./api";
import { fallbackStore } from "./fallbackStore";
import { normalizeAuth, normalizeUser } from "./normalizers";
import { env } from "../config/env";
import type { User, UserRole } from "../types/domain";

export interface LoginInput {
  email: string;
  password: string;
  role: UserRole;
}

export interface AuthResult {
  token?: string;
  user: User;
  requiresApproval?: boolean;
  message?: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
  organization?: string;
}

export const authService = {
  async login(input: LoginInput): Promise<{ token: string; user: User }> {
    try {
      const payload = await api.post<unknown>("/auth/login", input);
      const normalized = normalizeAuth(payload, input.role);
      if (!normalized.token) throw new Error("Backend login succeeded but did not return a JWT token.");
      return normalized;
    } catch (error) {
      if (!env.enableDemoFallback) throw error;
      return fallbackStore.login(input.email, input.role);
    }
  },
  async register(input: RegisterInput): Promise<AuthResult> {
    try {
      const payload = await api.post<unknown>("/auth/register", input);
      const normalized = normalizeAuth(payload, input.role);
      if (normalized.requiresApproval || !normalized.token) {
        return {
          token: normalized.token || undefined,
          user: normalized.user,
          requiresApproval: true,
          message: normalized.message || "Registration successful. Your account is pending admin approval."
        };
      }
      return normalized;
    } catch (error) {
      if (!env.enableDemoFallback) throw error;
      return fallbackStore.login(input.email, input.role);
    }
  },
  async me(fallbackRole: UserRole = "student"): Promise<User> {
    const payload = await api.get<unknown>("/auth/me");
    return normalizeUser(payload, fallbackRole);
  }
};
