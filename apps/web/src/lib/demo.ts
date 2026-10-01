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
const DEMO_STAFF_EMAIL = "tunde@demo.servicebook.app";

export function isDemoSlug(slug: string | undefined): boolean {
  return slug === DEMO_SLUG;
}

/** Link that signs into the demo owner account and opens `next` (e.g. "/inbox"). */
export function ownerDemoPath(next = "/dashboard"): string {
  return `/demo/owner?next=${encodeURIComponent(next)}`;
}

/** True while the signed-in account is the shared demo owner. */
export function useIsDemoAccount(): boolean {
  const { user } = useAuth();
  return user?.email === DEMO_EMAIL || user?.email === DEMO_STAFF_EMAIL;
}

/** True when a page is shown inside the /demo page's phone preview. */
export function isEmbedded(): boolean {
  return new URLSearchParams(window.location.search).get("embed") === "1";
}

/** Logs into the shared demo account and opens its dashboard (or `next`). */
export function useDemoLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Signs in to the demo as the owner, or (asStaff) as Tunde with his own staff login. */
  async function start(next = "/dashboard", asStaff = false) {
    setIsLoading(true);
    setError(null);
    try {
      await login(asStaff ? DEMO_STAFF_EMAIL : DEMO_EMAIL, DEMO_PASSWORD);
      navigate(next.startsWith("/") ? next : "/dashboard", { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "The demo is waking up. Try again in a few seconds.");
    } finally {
      setIsLoading(false);
    }
  }

  return { start, isLoading, error };
}
