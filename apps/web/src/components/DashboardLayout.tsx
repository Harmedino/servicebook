import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarDays,
  Check,
  ClipboardList,
  Copy,
  ExternalLink,
  Inbox,
  LayoutDashboard,
  LogOut,
  Moon,
  MoreHorizontal,
  Plus,
  Map as MapIcon,
  Scissors,
  Settings,
  Share2,
  Sun,
  UserRound,
  Users,
  Images,
  CalendarOff,
} from "lucide-react";
import { useAuth, useIsStaff } from "../lib/auth-context";
import { useMyBusiness } from "../lib/business";
import { useTheme } from "../lib/theme";
import { imageSrc } from "../lib/images";
import { Logo, LogoMark } from "./Logo";
import { InviteCustomersModal } from "./InviteCustomersModal";
import { MoreSheet, QuickActionsSheet } from "./MobileSheets";
import { NotificationBell, NotificationToasts } from "./Notifications";
import { useEnquiries } from "../lib/enquiries";
import { useConversations } from "../lib/bookingChat";
import { useIsDemoAccount } from "../lib/demo";
import { STAFF_HOME } from "../lib/staffMode";
import { useCopyLink } from "./CopyLinkDialog";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// Unlabelled groups: the day-to-day screens, then settings and extras.
const NAV_GROUPS: NavGroup[] = [
  {
    label: "",
    items: [
      { to: "/dashboard", label: "Home", icon: LayoutDashboard },
      { to: "/inbox", label: "Inbox", icon: Inbox },
      { to: "/bookings", label: "Bookings", icon: ClipboardList },
      { to: "/calendar", label: "Calendar", icon: CalendarDays },
      { to: "/customers", label: "Customers", icon: Users },
      { to: "/services", label: "Services", icon: Scissors },
      { to: "/staff", label: "Staff", icon: UserRound },
      { to: "/showcase", label: "Showcase", icon: Images },
      { to: "/time-off", label: "Time off", icon: CalendarOff },
    ],
  },
  {
    label: "",
    items: [
      { to: "/settings", label: "Settings", icon: Settings },
      { to: "/roadmap", label: "Roadmap & ideas", icon: MapIcon },
    ],
  },
];

// A staff login sees just their own day.
const STAFF_NAV_GROUPS: NavGroup[] = [
  {
    label: "",
    items: [
      { to: "/bookings", label: "My bookings", icon: ClipboardList },
      { to: "/calendar", label: "Calendar", icon: CalendarDays },
      { to: "/inbox", label: "Messages", icon: Inbox },
      { to: "/time-off", label: "Time off", icon: CalendarOff },
    ],
  },
];

const ALL_ITEMS = [...NAV_GROUPS, ...STAFF_NAV_GROUPS].flatMap((group) => group.items);

// Bottom tab bar on phones: Home, Calendar, the + menu, Inbox and More.
const MOBILE_TABS: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/inbox", label: "Inbox", icon: Inbox },
];

function isNavItemActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}


function ThemeButton({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5 text-white/80 transition-colors hover:bg-white/10 hover:text-white ${className}`}
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

function SidebarNav({
  pathname,
  onNavigate,
  badges = {},
  groups = NAV_GROUPS,
}: {
  pathname: string;
  onNavigate?: () => void;
  badges?: Record<string, number>;
  groups?: NavGroup[];
}) {
  return (
    <nav className="flex-1 space-y-5 divide-y divide-white/10 overflow-y-auto px-3 py-4 [&>*:not(:first-child)]:pt-5">
      {groups.map((group, groupIndex) => (
        <div key={groupIndex}>
          {group.label && <p className="mb-2 px-3 text-xs font-medium text-white/40">{group.label}</p>}
          <div className="space-y-0.5">
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
                    active ? "text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId={onNavigate ? "nav-active-mobile" : "nav-active"}
                      className="absolute inset-0 rounded-xl bg-white/[0.09] before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-highlight"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <Icon className={`relative h-4 w-4 shrink-0 ${active ? "text-highlight" : ""}`} aria-hidden="true" />
                  <span className="relative">{item.label}</span>
                  {(badges[item.to] ?? 0) > 0 && (
                    <span className="relative ml-auto rounded-full bg-highlight px-1.5 text-[11px] font-bold tabular-nums text-ink">{badges[item.to]}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function BookingLinkCard({ slug, enabled, businessName }: { slug?: string; enabled?: boolean; businessName?: string }) {
  const { copied, copy: copyLink, dialog: copyDialog } = useCopyLink();
  const [isShareOpen, setIsShareOpen] = useState(false);
  if (!slug) return null;
  const url = `${window.location.origin}/book/${slug}`;

  async function copy() {
    await copyLink(url, "Copy your booking link");
  }

  return (
    <div className="mx-3 mb-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-white">
      {copyDialog}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Your booking page</p>
        <a href={url} target="_blank" rel="noreferrer" aria-label="Open booking page" className="rounded-md p-1 text-white/50 transition hover:bg-white/10 hover:text-white">
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
      <p className="mt-1 truncate font-mono text-[13px] text-white/85">/book/{slug}</p>
      {!enabled && <p className="mt-1 text-xs text-amber-300">Online booking is paused</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/10 px-2 py-2 text-xs font-semibold transition hover:bg-white/15"
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={() => setIsShareOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-highlight px-2 py-2 text-xs font-semibold text-ink transition hover:bg-highlight-soft"
        >
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          Invite
        </button>
      </div>
      {isShareOpen && (
        <InviteCustomersModal slug={slug} businessName={businessName ?? "us"} onClose={() => setIsShareOpen(false)} />
      )}
    </div>
  );
}

function AccountArea({
  businessName,
  logoUrl,
  userName,
  onLogout,
}: {
  businessName?: string;
  logoUrl?: string;
  userName?: string;
  onLogout: () => void;
}) {
  return (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
        {logoUrl ? (
          <img src={imageSrc(logoUrl)} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-highlight text-sm font-bold text-ink">
            {(businessName ?? userName ?? "S").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{businessName ?? "Your business"}</p>
          <p className="truncate text-xs text-white/50">{userName}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Log out"
          title="Log out"
          className="shrink-0 rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const isDemo = useIsDemoAccount();
  const isStaff = useIsStaff();
  const home = isStaff ? STAFF_HOME : "/dashboard";
  const mobileTabs: NavItem[] = isStaff
    ? [{ to: STAFF_HOME, label: "Bookings", icon: ClipboardList }, MOBILE_TABS[1], { ...MOBILE_TABS[2], label: "Messages" }]
    : MOBILE_TABS;
  // Chat requests are the owner's; staff only get their own booking chats.
  const { data: enquiryData } = useEnquiries("open", { enabled: !isStaff });
  const { data: conversationData } = useConversations();
  // One badge for everything waiting in the Inbox: new chat requests and unread booking messages.
  const newEnquiries = (enquiryData?.counts.new ?? 0) + (conversationData?.unread ?? 0);
  const badges = { "/inbox": newEnquiries };

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const currentLabel = ALL_ITEMS.find((item) => isNavItemActive(location.pathname, item.to))?.label ?? "ServiceBook";
  const moreActive = !mobileTabs.some((tab) => isNavItemActive(location.pathname, tab.to));

  return (
    <div className="flex min-h-screen bg-stone-50">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 z-40 hidden h-screen w-64 shrink-0 flex-col bg-ink lg:flex">
        <div className="flex h-16 items-center justify-between px-5">
          <Logo to={home} tone="light" />
          <div className="flex items-center gap-2">
            {!isStaff && <NotificationBell />}
            <ThemeButton />
          </div>
        </div>
        <SidebarNav pathname={location.pathname} badges={badges} groups={isStaff ? STAFF_NAV_GROUPS : NAV_GROUPS} />
        <BookingLinkCard slug={business?.slug} enabled={business?.isPublicBookingEnabled} businessName={business?.name} />
        <AccountArea businessName={business?.name} logoUrl={business?.logoUrl} userName={user?.name} onLogout={handleLogout} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {isDemo && (
          <div data-demo-banner className="flex items-center gap-3 bg-highlight px-4 py-2 text-ink">
            <p className="min-w-0 flex-1 truncate text-xs font-medium sm:text-sm">
              <span className="font-semibold">Demo salon.</span> <span className="hidden sm:inline">Click around and change anything; it resets every day.</span>
            </p>
            <Link to="/demo" className="shrink-0 text-xs font-semibold underline-offset-2 hover:underline sm:text-sm">
              Back to site
            </Link>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/register");
              }}
              className="shrink-0 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white sm:text-sm"
            >
              Start free
            </button>
          </div>
        )}
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between bg-ink px-4 lg:hidden">
          <Link to={home} className="flex min-w-0 items-center gap-2.5">
            <LogoMark className="h-8 w-8 shrink-0" onDark />
            <span className="truncate font-display text-base font-bold text-white">{currentLabel}</span>
          </Link>
          <div className="flex items-center gap-2">
            {!isStaff && <NotificationBell />}
            <ThemeButton />
          </div>
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

      {!isStaff && <NotificationToasts />}

      {/* Mobile bottom tab bar */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-surface/95 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5 items-end">
          {mobileTabs.slice(0, 2).map((tab) => (
            <TabLink key={tab.to} tab={tab} active={isNavItemActive(location.pathname, tab.to)} />
          ))}
          <div className="flex justify-center">
            <button
              type="button"
              // Staff only add bookings, so + goes straight there.
              onClick={() => (isStaff ? navigate("/bookings/new", { state: { from: location.pathname } }) : setIsCreateOpen((open) => !open))}
              aria-label={isCreateOpen ? "Close quick actions" : "Quick actions"}
              aria-expanded={isCreateOpen}
              className="relative z-[60] -mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-highlight shadow-[0_10px_24px_-8px_rgb(12_26_20/0.6)] ring-4 ring-surface transition active:scale-95 dark:bg-highlight dark:text-ink"
            >
              <motion.span animate={{ rotate: isCreateOpen ? 45 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 22 }}>
                <Plus className="h-6 w-6" strokeWidth={2.25} aria-hidden="true" />
              </motion.span>
            </button>
          </div>
          <TabLink tab={mobileTabs[2]} active={isNavItemActive(location.pathname, mobileTabs[2].to)} badge={newEnquiries} />
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${moreActive ? "text-stone-900" : "text-stone-500"}`}
          >
            <MoreHorizontal className="h-[22px] w-[22px]" aria-hidden="true" />
            More
          </button>
        </div>
      </nav>

      <QuickActionsSheet open={isCreateOpen} onClose={() => setIsCreateOpen(false)} slug={business?.slug} businessName={business?.name} />
      <MoreSheet
        open={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        pathname={location.pathname}
        business={business ? { name: business.name, slug: business.slug, logoUrl: business.logoUrl } : undefined}
        userName={user?.name}
        onLogout={handleLogout}
        staffOnly={isStaff}
      />
    </div>
  );
}

function TabLink({ tab, active, badge = 0 }: { tab: NavItem; active: boolean; badge?: number }) {
  const Icon = tab.icon;
  return (
    <Link
      to={tab.to}
      aria-current={active ? "page" : undefined}
      className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active ? "text-stone-900" : "text-stone-500"}`}
    >
      {active && (
        <motion.span layoutId="tab-indicator" className="absolute top-0 h-0.5 w-8 rounded-full bg-stone-900" transition={{ type: "spring", stiffness: 500, damping: 35 }} />
      )}
      <span className="relative">
        <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
        {badge > 0 && (
          <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white ring-2 ring-surface">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      {tab.label}
    </Link>
  );
}
