import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, ServerCrash } from "lucide-react";
import { API_URL } from "../lib/apiClient";

type State = "ok" | "waking" | "down";

// Free hosting plans sleep when idle and the first request can take up to a
// minute. Say so, instead of letting sign-up or loading silently fail.
export function ServerStatus() {
  const [state, setState] = useState<State>("ok");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const slow = setTimeout(() => !cancelled && setState((s) => (s === "ok" ? "waking" : s)), 3500);

    async function check() {
      attempts += 1;
      try {
        const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        clearTimeout(slow);
        if (!cancelled) setState("ok");
      } catch {
        if (cancelled) return;
        setState(attempts >= 8 ? "down" : "waking");
        retry = setTimeout(check, 6000);
      }
    }
    void check();
    return () => {
      cancelled = true;
      clearTimeout(slow);
      clearTimeout(retry);
    };
  }, []);

  return (
    <AnimatePresence>
      {state !== "ok" && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          role="status"
          className="fixed inset-x-3 bottom-24 z-[90] mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-stone-200 bg-surface px-4 py-3 text-sm shadow-[var(--shadow-elevated)] lg:bottom-6"
        >
          {state === "waking" ? (
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-brand-600" aria-hidden="true" />
          ) : (
            <ServerCrash className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
          )}
          <p className="text-stone-700">
            {state === "waking"
              ? "Connecting to the server. The first visit after a quiet spell can take up to a minute."
              : "We can't reach the server right now. Please try again shortly."}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
