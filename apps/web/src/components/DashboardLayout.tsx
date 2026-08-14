import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, type ReactNode } from "react";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Scissors,
  Settings,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { useMyBusiness } from "../lib/business";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { label: "Overview", items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Manage",
    items: [
      { to: "/bookings", label: "Bookings", icon: ClipboardList },
      { to: "/calendar", label: "Calendar", icon: CalendarDays },
      { to: "/customers", label: "Customers", icon: Users },
      { to: "/services", label: "Services", icon: Scissors },
      { to: "/staff", label: "Staff", icon: UserRound },
    ],
  },
  { label: "Settings", items: [{ to: "/settings", label: "Settings", icon: Settings }] },
];

function isNavItemActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-stone-400">{group.label}</p>
          <div className="mt-2 space-y-0.5">
            {group.items.map((item) => {
              const active = isNavItemActive(pathname, item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-brand-50 text-brand-700" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function AccountArea({ businessName, userName, onLogout }: { businessName?: string; userName?: string; onLogout: () => void }) {
  return (
    <div className="border-t border-stone-200 p-3">
      <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {(businessName ?? userName ?? "S").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-stone-900">{businessName ?? "Your business"}</p>
          <p className="truncate text-xs text-stone-500">{userName}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Log out"
          title="Log out"
          className="shrink-0 rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { data: businessData } = useMyBusiness();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const currentLabel =
    NAV_GROUPS.flatMap((group) => group.items).find((item) => isNavItemActive(location.pathname, item.to))?.label ??
    "ServiceBook";

  return (
    <div className="flex min-h-screen bg-stone-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-stone-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-stone-200 px-5">
          <span className="text-lg font-semibold tracking-tight text-stone-900">ServiceBook</span>
        </div>
        <SidebarNav pathname={location.pathname} />
        <AccountArea businessName={businessData?.business?.name} userName={user?.name} onLogout={handleLogout} />
      </aside>

      {/* Mobile drawer */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-stone-900/40"
            onClick={() => setIsMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div className="animate-fade-in-up absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-stone-200 px-5">
              <span className="text-lg font-semibold tracking-tight text-stone-900">ServiceBook</span>
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <SidebarNav pathname={location.pathname} onNavigate={() => setIsMobileNavOpen(false)} />
            <AccountArea businessName={businessData?.business?.name} userName={user?.name} onLogout={handleLogout} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-stone-200 bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="text-sm font-semibold text-stone-900">{currentLabel}</span>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
