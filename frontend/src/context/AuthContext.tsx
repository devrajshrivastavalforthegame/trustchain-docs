import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { clearAccessToken, loginRequest, logoutRequest, refreshSessionRequest, registerRequest, setAccessToken } from '../services/api';

type UserStatus = 'pending' | 'approved' | 'rejected' | 'unknown';
export type AuthUser = { id: number | string; name: string; email: string; role: string; roleId?: number | string | null; status: UserStatus; permissions: string[] };
type LoginInput = { email: string; password: string };
type RegisterInput = { name: string; email: string; password: string; role: string };

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingApproval: boolean;
  rejected: boolean;
  authMessage: string | null;
  login: (input: LoginInput) => Promise<{ ok: boolean; status?: string; message?: string }>;
  register: (input: RegisterInput) => Promise<{ ok: boolean; status?: string; message?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  hasPermission: (...permissions: string[]) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeUser(raw: any): AuthUser | null {
  if (!raw) return null;
  return { id: raw.id, name: raw.name || 'User', email: raw.email, role: raw.role || 'student', roleId: raw.roleId ?? raw.role_id ?? null, status: raw.status || 'unknown', permissions: Array.isArray(raw.permissions) ? raw.permissions : [] };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessTokenState, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const applyAuthPayload = useCallback((data: any) => {
    if (data?.accessToken) { setAccessToken(data.accessToken); setAccessTokenState(data.accessToken); }
    const normalized = normalizeUser(data?.user);
    setUser(normalized);
    setAuthMessage(data?.message || null);
    return normalized;
  }, []);

  const refreshSession = useCallback(async () => {
    try { const data = await refreshSessionRequest(); applyAuthPayload(data); return true; }
    catch { clearAccessToken(); setAccessTokenState(null); setUser(null); return false; }
  }, [applyAuthPayload]);

  useEffect(() => { let live = true; refreshSession().finally(() => { if (live) setIsLoading(false); }); return () => { live = false; }; }, [refreshSession]);

  const login = useCallback(async ({ email, password }: LoginInput) => {
    try { const data = await loginRequest(email, password); const normalized = applyAuthPayload(data); return { ok: true, status: normalized?.status, message: data?.message || 'Login successful.' }; }
    catch (error: any) { const data = error.response?.data; const normalized = normalizeUser(data?.user); setUser(normalized); clearAccessToken(); setAccessTokenState(null); setAuthMessage(data?.message || 'Login failed.'); return { ok: false, status: normalized?.status || data?.code, message: data?.message || 'Login failed.' }; }
  }, [applyAuthPayload]);

  const register = useCallback(async (input: RegisterInput) => {
    try { const data = await registerRequest(input); const normalized = applyAuthPayload(data); return { ok: data?.code !== 'ACCOUNT_PENDING', status: normalized?.status || data?.code, message: data?.message || 'Registration submitted.' }; }
    catch (error: any) { const data = error.response?.data; setAuthMessage(data?.message || 'Registration failed.'); return { ok: false, status: data?.code, message: data?.message || 'Registration failed.' }; }
  }, [applyAuthPayload]);

  const logout = useCallback(async () => { await logoutRequest(); clearAccessToken(); setAccessTokenState(null); setUser(null); setAuthMessage(null); }, []);
  const hasPermission = useCallback((...permissions: string[]) => !!user && permissions.every(p => user.permissions.includes(p)), [user]);
  const hasAnyPermission = useCallback((...permissions: string[]) => !!user && permissions.some(p => user.permissions.includes(p)), [user]);

  const value = useMemo(() => ({ user, accessToken: accessTokenState, isAuthenticated: Boolean(user && user.status === 'approved' && accessTokenState), isLoading, pendingApproval: user?.status === 'pending', rejected: user?.status === 'rejected', authMessage, login, register, logout, refreshSession, hasPermission, hasAnyPermission }), [user, accessTokenState, isLoading, authMessage, login, register, logout, refreshSession, hasPermission, hasAnyPermission]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be used inside AuthProvider'); return ctx; }
export function AccountPendingNotice({ message }: { message?: string }) { return <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-100"><h3 className="font-semibold">Account pending approval</h3><p className="mt-1 text-sm text-amber-100/80">{message || 'Your account has been created, but an administrator must approve it before you can access TrustChain Docs.'}</p></div>; }
export function AccountRejectedNotice({ message }: { message?: string }) { return <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-100"><h3 className="font-semibold">Account rejected</h3><p className="mt-1 text-sm text-red-100/80">{message || 'Your account request was rejected. Please contact the platform administrator.'}</p></div>; }
export { api };
