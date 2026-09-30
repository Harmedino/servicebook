import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth-context";
import { ApiError } from "./apiClient";

// The API seeds this business on start-up (SEED_DEMO), so these always exist.
export const DEMO_SLUG = "glow-studio-lekki";
export const DEMO_BOOKING_PATH = `/book/${DEMO_SLUG}`;
export const DEMO_JOIN_PATH = `/join/${DEMO_SLUG}`;
const DEMO_EMAIL = "demo@servicebook.app";
const DEMO_PASSWORD = "password123";

/** Logs into the shared demo account and opens its dashboard. */
export function useDemoLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setIsLoading(true);
    setError(null);
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD);
      navigate("/dashboard");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "The demo is waking up. Try again in a few seconds.");
    } finally {
      setIsLoading(false);
    }
  }

  return { start, isLoading, error };
}
