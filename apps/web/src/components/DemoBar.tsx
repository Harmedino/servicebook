import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "./Logo";
import { isEmbedded } from "../lib/demo";

/**
 * Slim bar on the demo salon's customer pages, so people trying the demo can
 * get back to the website or sign up.
 * Hidden inside the /demo page's phone preview, which has the site header already.
 */
export function DemoBar() {
  if (isEmbedded()) return null;
  return (
    <div data-demo-banner className="sticky top-0 z-40 bg-ink text-white">
      <div className="mx-auto flex h-12 max-w-5xl items-center gap-3 px-4">
        <Link to="/demo" className="flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white" aria-label="Back to the demo tour">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <LogoMark className="h-6 w-6" onDark />
          <span className="hidden font-display font-semibold text-white sm:inline">ServiceBook</span>
        </Link>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-highlight">Demo</span>
        <span className="hidden truncate text-xs text-white/50 md:inline">A sample salon. Nothing here is a real appointment.</span>
        <div className="ml-auto flex items-center gap-1.5">
          <Link to="/register" className="rounded-full bg-highlight px-3 py-1.5 text-xs font-semibold text-ink hover:bg-highlight-soft">
            Start free
          </Link>
        </div>
      </div>
    </div>
  );
}
