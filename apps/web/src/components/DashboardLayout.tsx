import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarDays,
  Check,
  ClipboardList,
  Copy,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Moon,
  MoreHorizontal,
  Plus,
  Scissors,
  Settings,
  Sun,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { useMyBusiness } from "../lib/business";
import { useTheme } from "../lib/theme";

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

const ALL_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

// Bottom tab bar on phones: the four most-used screens plus "More".
const MOBILE_TABS: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/bookings", label: "Bookings", icon: ClipboardList },
  { to: "/customers", label: "Clients", icon: Users },
];

function isNavItemActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function Logo() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-sm">
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-stone-900">ServiceBook</span>
    </Link>
  );
}

function ThemeButton({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-surface text-stone-600 transition-colors hover:bg-stone-100 ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ y: -16, opacity: 0, rotate: -90 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 16, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.18 }}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400">{group.label}</p>
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
                  className={`relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "text-brand-700" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId={onNavigate ? "nav-active-mobile" : "nav-active"}
                      className="absolute inset-0 rounded-xl bg-brand-50"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <Icon className="relative h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function BookingLinkCard({ slug, enabled }: { slug?: string; enabled?: boolean }) {
  const [copied, setCopied] = useState(false);
  if (!slug) return null;
  const url = `${window.location.origin}/book/${slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy your booking link", url);
    }
  }

  return (
    <div className="mx-3 mb-3 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 p-4 text-white">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Your booking page</p>
      <p className="mt-1 truncate text-sm font-medium">/book/{slug}</p>
      {!enabled && <p className="mt-1 text-xs text-amber-200">Online booking is paused</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/15 px-2 py-1.5 text-xs font-semibold backdrop-blur transition hover:bg-white/25"
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label="Open booking page"
          className="inline-flex items-center justify-center rounded-lg bg-white/15 px-2.5 py-1.5 backdrop-blur transition hover:bg-white/25"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}

function AccountArea({ businessName, userName, onLogout }: { businessName?: string; userName?: string; onLogout: () => void }) {
  return (
    <div className="border-t border-stone-200 p-3">
      <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-sm font-bold text-white">
          {(businessName ?? userName ?? "S").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-900">{businessName ?? "Your business"}</p>
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
  const business = businessData?.business ?? undefined;
  const navigate = useNavigate();
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const currentLabel = ALL_ITEMS.find((item) => isNavItemActive(location.pathname, item.to))?.label ?? "ServiceBook";
  const moreActive = !MOBILE_TABS.some((tab) => isNavItemActive(location.pathname, tab.to));

  return (
    <div className="flex min-h-screen bg-stone-50">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-stone-200 bg-surface lg:flex">
        <div className="flex h-16 items-center justify-between px-5">
          <Logo />
          <ThemeButton />
        </div>
        <SidebarNav pathname={location.pathname} />
        <BookingLinkCard slug={business?.slug} enabled={business?.isPublicBookingEnabled} />
        <AccountArea businessName={business?.name} userName={user?.name} onLogout={handleLogout} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-stone-200 bg-surface/85 px-4 backdrop-blur-xl lg:hidden">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-display text-base font-bold text-stone-900">{currentLabel}</span>
          </div>
          <ThemeButton />
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:py-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-surface/90 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5 items-end">
          {MOBILE_TABS.slice(0, 2).map((tab) => (
            <TabLink key={tab.to} tab={tab} active={isNavItemActive(location.pathname, tab.to)} />
          ))}
          <div className="flex justify-center">
            <Link
              to="/bookings?new=1"
              aria-label="New booking"
              className="-mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow-[0_12px_24px_-8px_rgb(79_70_229/0.7)] transition active:scale-95"
            >
              <Plus className="h-6 w-6" aria-hidden="true" />
            </Link>
          </div>
          <TabLink tab={MOBILE_TABS[2]} active={isNavItemActive(location.pathname, MOBILE_TABS[2].to)} />
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${moreActive ? "text-brand-700" : "text-stone-500"}`}
          >
            <MoreHorizontal className="h-[22px] w-[22px]" aria-hidden="true" />
            More
          </button>
        </div>
      </nav>

      {/* Mobile "More" sheet */}
      <AnimatePresence>
        {isMoreOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
            />
            <motion.div
              className="pb-safe absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-surface"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
            >
              <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-stone-300" />
              <div className="flex items-center justify-between px-5 pt-3">
                <span className="font-display text-lg font-bold text-stone-900">Menu</span>
                <button
                  type="button"
                  onClick={() => setIsMoreOpen(false)}
                  aria-label="Close menu"
                  className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <SidebarNav pathname={location.pathname} onNavigate={() => setIsMoreOpen(false)} />
              <BookingLinkCard slug={business?.slug} enabled={business?.isPublicBookingEnabled} />
              <AccountArea businessName={business?.name} userName={user?.name} onLogout={handleLogout} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabLink({ tab, active }: { tab: NavItem; active: boolean }) {
  const Icon = tab.icon;
  return (
    <Link
      to={tab.to}
      aria-current={active ? "page" : undefined}
      className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active ? "text-brand-700" : "text-stone-500"}`}
    >
      {active && (
        <motion.span layoutId="tab-indicator" className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-600" transition={{ type: "spring", stiffness: 500, damping: 35 }} />
      )}
      <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 1.9} aria-hidden="true" />
      {tab.label}
    </Link>
  );
}
