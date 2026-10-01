import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * "← Back" that returns to the page you came from when the app sent you here
 * (state.from), otherwise to a sensible parent page.
 */
export function BackLink({ to, label }: { to: string; label: string }) {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  return (
    <Link
      to={from ?? to}
      className="-ml-2 inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {from ? "Back" : label}
    </Link>
  );
}
