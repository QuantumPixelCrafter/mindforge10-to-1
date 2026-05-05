import { useState, useEffect, useCallback } from "react";
import type { AuthUser } from "@workspace/api-client-react";

export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
  loginWithCredentials: (username: string, password: string) => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
  refetch: () => void;
}

export interface RegisterData {
  username: string;
  password: string;
  country?: string;
  gradeIndex?: number;
  preferredLanguage?: string;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetch("/api/auth/user", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ user: AuthUser | null }>;
      })
      .then((data) => {
        if (!cancelled) {
          setUser(data.user ?? null);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

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
    setUser(data.user);
  }, []);

  const register = useCallback(async ({ username, password, country, gradeIndex, preferredLanguage }: RegisterData) => {
    setAuthError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password, country, gradeIndex, preferredLanguage }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAuthError(data.error ?? "Registration failed.");
      throw new Error(data.error ?? "Registration failed.");
    }
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    window.location.href = "/";
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    loginWithCredentials,
    authError,
    clearAuthError,
    refetch,
  };
}
