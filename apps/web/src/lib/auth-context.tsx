import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthResponse, MeResponse, SafeUser } from "@servicebook/types";
import { ApiError, apiRequest, getStoredToken, onUnauthorized, setStoredToken } from "./apiClient";

/** Waits between tries while restoring a session; null = stop trying. About 60s in total. */
const SESSION_RETRY_DELAYS_MS: (number | null)[] = [2_000, 4_000, 8_000, 15_000, 30_000, null];

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

      // Only a 401 means the token is bad. A dropped connection, an aborted
      // page load or the free-tier server waking up (502/503) must not log
      // the owner out, so those are retried for about a minute.
      for (const delay of SESSION_RETRY_DELAYS_MS) {
        try {
          const data = await apiRequest<MeResponse>("/api/auth/me");
          if (!cancelled) setUser(data.user);
          break;
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            setStoredToken(null);
            break;
          }
          if (cancelled || delay === null) break;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      if (!cancelled) setIsLoading(false);
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
