import { Link, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../lib/auth-context";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="text-lg font-semibold text-stone-900">ServiceBook</span>
          <nav className="flex items-center gap-4 text-sm text-stone-600">
            <Link to="/dashboard" className="hover:text-stone-900">
              Dashboard
            </Link>
            <Link to="/services" className="hover:text-stone-900">
              Services
            </Link>
            <Link to="/staff" className="hover:text-stone-900">
              Staff
            </Link>
            <Link to="/customers" className="hover:text-stone-900">
              Customers
            </Link>
            <Link to="/bookings" className="hover:text-stone-900">
              Bookings
            </Link>
            <Link to="/dashboard/settings" className="hover:text-stone-900">
              Settings
            </Link>
          </nav>
        </div>
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
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
