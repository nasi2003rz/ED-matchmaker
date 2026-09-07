"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "./api";

export type RoleName = "INSTRUCTOR" | "STUDENT" | "PARENT";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: RoleName[];
  profile: {
    avatarUrl: string | null;
    phone: string | null;
    bio: string | null;
  } | null;
}

interface AuthResponse {
  user: { id: string; email: string; name: string };
  accessToken: string;
}

interface MeResponse {
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  addRole: (role: RoleName) => Promise<void>;
  refreshUser: () => Promise<void>;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const accessTokenRef = useRef<string | null>(null);

  const loadMe = useCallback(async (accessToken: string) => {
    const data = await apiFetch<MeResponse>("/users/me", { accessToken });
    setUser(data.user);
  }, []);

  useEffect(() => {
    apiFetch<AuthResponse>("/auth/refresh", { method: "POST" })
      .then(async (data) => {
        accessTokenRef.current = data.accessToken;
        await loadMe(data.accessToken);
      })
      .catch(() => {
        accessTokenRef.current = null;
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, [loadMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      accessTokenRef.current = data.accessToken;
      await loadMe(data.accessToken);
    },
    [loadMe],
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const data = await apiFetch<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      });
      accessTokenRef.current = data.accessToken;
      await loadMe(data.accessToken);
    },
    [loadMe],
  );

  const logout = useCallback(async () => {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
    accessTokenRef.current = null;
    setUser(null);
  }, []);

  const addRole = useCallback(
    async (role: RoleName) => {
      if (!accessTokenRef.current) return;
      await apiFetch("/users/me/roles", {
        method: "POST",
        accessToken: accessTokenRef.current,
        body: JSON.stringify({ role }),
      });
      await loadMe(accessTokenRef.current);
    },
    [loadMe],
  );

  const refreshUser = useCallback(async () => {
    if (!accessTokenRef.current) return;
    await loadMe(accessTokenRef.current);
  }, [loadMe]);

  const getAccessToken = useCallback(() => accessTokenRef.current, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        addRole,
        refreshUser,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
