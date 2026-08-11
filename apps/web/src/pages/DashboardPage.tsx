import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
        <span className="text-lg font-semibold text-stone-900">ServiceBook</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-stone-600">{user?.name}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
          >
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-stone-900">Dashboard</h1>
        <p className="mt-1 text-sm text-stone-500">
          Owner features (bookings, services, staff, customers) land in upcoming steps.
        </p>
      </main>
    </div>
  );
}
