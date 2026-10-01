import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { StaffInviteInfoResponse } from "@servicebook/types";
import { apiRequest, ApiError } from "../lib/apiClient";
import { useAuth } from "../lib/auth-context";
import { STAFF_HOME } from "../lib/staffMode";
import { Logo } from "../components/Logo";
import { PasswordInput } from "../components/PasswordInput";

/** /join-team/:token — a staff member creates their own login from the owner's invite. */
export function JoinTeamPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { acceptInvite, isAuthenticated, logout } = useAuth();
  const { data, isPending, isError } = useQuery({
    queryKey: ["invite", token],
    queryFn: () => apiRequest<StaffInviteInfoResponse>(`/api/auth/invites/${token}`, { auth: false }),
    retry: false,
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const shownEmail = email || data?.email || "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shownEmail)) return setError("Enter a valid email address");
    if (password.length < 8) return setError("Use at least 8 characters for your password");
    setError(null);
    setSaving(true);
    try {
      // Someone else signed in on this device (e.g. the owner testing the link): sign them out first.
      if (isAuthenticated) logout();
      await acceptInvite(token, shownEmail.trim(), password);
      navigate(STAFF_HOME, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 py-10">
      <Logo />
      <div className="mt-8 w-full max-w-sm rounded-3xl border border-stone-200 bg-surface p-6 sm:p-8">
        {isPending ? (
          <div className="skeleton-shimmer h-48 rounded-2xl bg-stone-100" />
        ) : isError || !data ? (
          <div className="text-center">
            <h1 className="text-lg font-semibold text-stone-900">This invite isn&apos;t working</h1>
            <p className="mt-2 text-sm text-stone-500">It may have expired or already been used. Ask for a new invite link.</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            <div>
              <p className="text-sm text-stone-500">{data.businessName}</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">Hi {data.staffName.split(" ")[0]}, set up your login</h1>
              <p className="mt-2 text-sm text-stone-500">You&apos;ll see your own appointments, chat with your customers and add time off.</p>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-stone-700">Email</span>
              <input
                type="email"
                value={shownEmail}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="mt-1 w-full rounded-lg border border-stone-300 bg-surface px-3 py-2.5 text-base text-stone-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 sm:text-sm"
              />
            </label>
            <PasswordInput label="Choose a password" value={password} onChange={setPassword} autoComplete="new-password" />
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink text-sm font-semibold text-white hover:bg-ink-700 disabled:opacity-70 dark:bg-highlight dark:text-ink"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Create my login
            </button>
            <p className="text-center text-xs text-stone-400">
              Already set up? <Link to="/login" className="font-semibold text-stone-700 underline">Log in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
