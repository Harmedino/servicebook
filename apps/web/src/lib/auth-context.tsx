import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthResponse, MeResponse, SafeUser } from "@servicebook/types";
import { apiRequest, getStoredToken, onUnauthorized, setStoredToken } from "./apiClient";

interface AuthContextValue {
  user: SafeUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore the session on first load: if a token is stored, validate it
  // against the server (never trust it blindly) before treating the user as authenticated.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!getStoredToken()) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await apiRequest<MeResponse>("/api/auth/me");
        if (!cancelled) {
          setUser(data.user);
        }
      } catch {
        setStoredToken(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // Any authenticated request coming back 401 (expired/invalid token) clears
  // auth state centrally, without every call site handling it individually.
  useEffect(() => {
    return onUnauthorized(() => {
      setStoredToken(null);
      setUser(null);
    });
  }, []);

  async function login(email: string, password: string) {
    const data = await apiRequest<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    setStoredToken(data.token);
    setUser(data.user);
  }

  async function register(name: string, email: string, password: string) {
    const data = await apiRequest<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: { name, email, password },
      auth: false,
    });
    setStoredToken(data.token);
    setUser(data.user);
  }

  function logout() {
    setStoredToken(null);
    setUser(null);
  }

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
