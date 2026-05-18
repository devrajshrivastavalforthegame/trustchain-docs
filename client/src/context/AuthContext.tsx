import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { authService, type LoginInput, type RegisterInput } from "../services/authService";
import { pingBackend } from "../services/api";
import { storage } from "../utils/storage";
import type { ApiMode, User } from "../types/domain";
import { env } from "../config/env";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  apiMode: ApiMode;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<{ requiresApproval?: boolean }>;
  logout: () => void;
  refreshApiMode: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => storage.getUser());
  const [token, setToken] = useState<string | null>(() => storage.getToken());
  const [loading, setLoading] = useState(false);
  const [apiMode, setApiMode] = useState<ApiMode>({ online: false, fallback: env.enableDemoFallback });

  const refreshApiMode = useCallback(async () => {
    const online = await pingBackend();
    setApiMode({ online, fallback: env.enableDemoFallback && !online, lastCheckedAt: new Date().toISOString() });
  }, []);

  useEffect(() => {
    void refreshApiMode();
  }, [refreshApiMode]);

  const persistSession = (nextToken: string, nextUser: User) => {
    storage.setToken(nextToken);
    storage.setUser(nextUser);
    setToken(nextToken);
    setUser(nextUser);
  };

  const login = async (input: LoginInput) => {
    setLoading(true);
    try {
      const result = await authService.login(input);
      persistSession(result.token, result.user);
      toast.success(`Logged in as ${result.user.role}.`);
    } finally {
      setLoading(false);
    }
  };

  const register = async (input: RegisterInput) => {
    setLoading(true);
    try {
      const result = await authService.register(input);
      if (result.requiresApproval || !result.token) {
        toast.success(result.message || "Account created. Waiting for admin approval.");
        return { requiresApproval: true };
      }
      persistSession(result.token, result.user);
      toast.success("Account created and signed in.");
      return { requiresApproval: false };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    storage.clear();
    setUser(null);
    setToken(null);
    toast.success("Signed out.");
  };

  const value = useMemo(
    () => ({ user, token, loading, apiMode, login, register, logout, refreshApiMode }),
    [user, token, loading, apiMode, refreshApiMode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
};
