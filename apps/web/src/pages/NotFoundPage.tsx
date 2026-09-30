import { Link } from "react-router-dom";
import { Logo } from "../components/Logo";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col bg-ink-grid px-4 text-center">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center">
        <Logo tone="light" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center pb-16">
        <p className="font-display text-8xl font-semibold tracking-tight text-highlight sm:text-9xl">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-white">This page doesn&apos;t exist.</h1>
        <p className="mt-2 max-w-sm text-sm text-white/60">The link may be old or mistyped. If a business sent it, ask them for their latest booking link.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/" className="inline-flex h-11 items-center justify-center rounded-full bg-highlight px-6 text-sm font-semibold text-ink">
            Go to the homepage
          </Link>
          <Link to="/dashboard" className="inline-flex h-11 items-center justify-center rounded-full border border-white/20 px-6 text-sm font-medium text-white hover:bg-white/10">
            Open my dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
