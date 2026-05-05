import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { AuthUser } from "@workspace/api-client-react";

export type { AuthUser };

export interface RegisterData {
  username: string;
  password: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
  loginWithCredentials: (username: string, password: string) => Promise<void>;
  updateLevel: (level: string | null) => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AUTH_SID_KEY = "study_smart_sid";

function getStoredSid(): string | null {
  try {
    return localStorage.getItem(AUTH_SID_KEY);
  } catch {
    return null;
  }
}

function storeSid(sid: string) {
  try {
    localStorage.setItem(AUTH_SID_KEY, sid);
  } catch {}
}

function clearStoredSid() {
  try {
    localStorage.removeItem(AUTH_SID_KEY);
  } catch {}
}

function authHeaders(): HeadersInit {
  const sid = getStoredSid();
  return sid ? { Authorization: `Bearer ${sid}` } : {};
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/auth/user", {
      credentials: "include",
      headers: authHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ user: AuthUser | null; sid?: string }>;
      })
      .then((data) => {
        if (data.sid) storeSid(data.sid);
        setUser(data.user ?? null);
        setIsLoading(false);
      })
      .catch(() => {
        setUser(null);
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(() => {
    const base = import.meta.env.BASE_URL.replace(/\/+$/, "") || "/";
    window.location.href = `/api/login?returnTo=${encodeURIComponent(base)}`;
  }, []);

  const loginWithCredentials = useCallback(async (username: string, password: string) => {
    setAuthError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAuthError(data.error ?? "Login failed.");
      throw new Error(data.error ?? "Login failed.");
    }
    if (data.sid) storeSid(data.sid);
    setUser(data.user);
  }, []);

  const register = useCallback(async ({ username, password }: RegisterData) => {
    setAuthError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAuthError(data.error ?? "Registration failed.");
      throw new Error(data.error ?? "Registration failed.");
    }
    if (data.sid) storeSid(data.sid);
    setUser(data.user);
  }, []);

  const updateLevel = useCallback(async (level: string | null) => {
    const res = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify({ level }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to update level.");
    setUser(prev => prev ? { ...prev, level: data.user.level } : prev);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: authHeaders(),
    });
    clearStoredSid();
    setUser(null);
    window.location.href = "/";
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      register,
      loginWithCredentials,
      updateLevel,
      authError,
      clearAuthError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
