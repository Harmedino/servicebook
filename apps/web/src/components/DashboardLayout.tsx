import { Link, useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../lib/auth-context";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/calendar", label: "Calendar" },
  { to: "/bookings", label: "Bookings" },
  { to: "/customers", label: "Customers" },
  { to: "/services", label: "Services" },
  { to: "/staff", label: "Staff" },
  { to: "/settings", label: "Settings" },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    isActive ? "font-medium text-brand-700" : "text-stone-600 transition-colors hover:text-stone-900"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
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
