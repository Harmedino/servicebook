import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useDemoLogin } from "../lib/demo";
import { Logo } from "../components/Logo";

/** /demo/owner?next=/inbox — signs into the demo salon's owner account and opens that page. */
export function DemoOwnerPage() {
  const [params] = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const demo = useDemoLogin();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void demo.start(next);
  }, [demo, next]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink-grid px-4 text-center">
      <Logo tone="light" size="lg" />
      {demo.error ? (
        <div className="max-w-sm">
          <p className="text-white">{demo.error}</p>
          <div className="mt-5 flex justify-center gap-3">
            <button type="button" onClick={() => void demo.start(next)} className="h-11 rounded-full bg-highlight px-5 text-sm font-semibold text-ink">
              Try again
            </button>
            <Link to="/demo" className="inline-flex h-11 items-center rounded-full border border-white/20 px-5 text-sm font-medium text-white">
              Back to the demo
            </Link>
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-white/70">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Opening the salon owner&apos;s dashboard…
        </p>
      )}
    </div>
  );
}
