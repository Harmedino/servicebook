import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import {
  CalendarPlus,
  Check,
  ChevronRight,
  ClipboardList,
  Copy,
  ExternalLink,
  LogOut,
  Map as MapIcon,
  Moon,
  QrCode,
  Scissors,
  Send,
  Settings,
  Sun,
  UserPlus,
  UserRound,
  Users,
  Images,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "../lib/theme";
import { imageSrc } from "../lib/images";
import { InviteCustomersModal } from "./InviteCustomersModal";

/** A bottom sheet that can be dragged down to close. */
export function BottomSheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 90 || info.velocity.y > 600) onClose();
  }
  // Rendered at the end of <body> so no parent's stacking (sticky headers, the tab bar) can sit on top of it.
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={label}>
          <motion.div className="absolute inset-0 bg-black/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="pb-safe absolute inset-x-0 bottom-0 max-h-[88svh] overflow-y-auto rounded-t-[1.75rem] bg-surface"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={handleDragEnd}
          >
            <div className="flex justify-center pb-1 pt-2.5">
              <span className="h-1.5 w-10 rounded-full bg-stone-300" />
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

interface QuickAction {
  label: string;
  note: string;
  icon: LucideIcon;
  to?: string;
  invite?: "book" | "join";
}

const SECONDARY_ACTIONS: QuickAction[] = [
  { label: "Add a customer", note: "Save a name and number", icon: UserPlus, to: "/customers/new" },
  { label: "Share booking link", note: "WhatsApp, copy or QR", icon: Send, invite: "book" },
  { label: "Invite to client list", note: "They add their own details", icon: QrCode, invite: "join" },
  { label: "Add a service", note: "Name, price, duration", icon: Scissors, to: "/services/new" },
  { label: "Add staff", note: "Services and hours", icon: UserRound, to: "/staff/new" },
];

/** What the mobile + button opens. */
export function QuickActionsSheet({
  open,
  onClose,
  slug,
  businessName,
}: {
  open: boolean;
  onClose: () => void;
  slug?: string;
  businessName?: string;
}) {
  const navigate = useNavigate();
  const [invite, setInvite] = useState<"book" | "join" | null>(null);

  function pick(action: QuickAction) {
    onClose();
    if (action.to) navigate(action.to);
    else if (action.invite) setInvite(action.invite);
  }

  return (
    <>
      <BottomSheet open={open} onClose={onClose} label="Quick actions">
        <div className="px-4 pb-5 pt-2">
          <p className="px-1 text-sm font-medium text-stone-500">Create</p>
          <button
            type="button"
            onClick={() => pick({ label: "New booking", note: "", icon: CalendarPlus, to: "/bookings/new" })}
            className="mt-3 flex w-full items-center gap-4 rounded-2xl bg-ink px-4 py-4 text-left text-white active:scale-[0.99] dark:bg-brand-700"
          >
            <CalendarPlus className="h-6 w-6 shrink-0 text-highlight" strokeWidth={1.75} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold">New booking</span>
              <span className="block text-sm text-white/60">Customer, service and time, including walk-ins</span>
            </span>
            <ChevronRight className="h-5 w-5 text-white/40" aria-hidden="true" />
          </button>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            {SECONDARY_ACTIONS.map((action, index) => (
              <motion.button
                key={action.label}
                type="button"
                onClick={() => pick(action)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + index * 0.03 }}
                className={`flex flex-col items-start gap-3 rounded-2xl border border-stone-200 p-3.5 text-left active:bg-stone-50 ${
                  index === SECONDARY_ACTIONS.length - 1 && SECONDARY_ACTIONS.length % 2 === 1 ? "col-span-2" : ""
                }`}
              >
                <action.icon className="h-5 w-5 text-stone-800" strokeWidth={1.75} aria-hidden="true" />
                <span>
                  <span className="block text-sm font-semibold text-stone-900">{action.label}</span>
                  <span className="block text-xs text-stone-500">{action.note}</span>
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </BottomSheet>
      {invite && slug && <InviteCustomersModal slug={slug} businessName={businessName ?? "us"} initialKind={invite} onClose={() => setInvite(null)} />}
    </>
  );
}

const DESTINATIONS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/bookings", label: "Bookings", icon: ClipboardList },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/services", label: "Services", icon: Scissors },
  { to: "/staff", label: "Staff", icon: UserRound },
  { to: "/showcase", label: "Showcase", icon: Images },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/roadmap", label: "Roadmap", icon: MapIcon },
];

/** What the mobile "More" tab opens: everything that isn't in the tab bar. */
export function MoreSheet({
  open,
  onClose,
  pathname,
  business,
  userName,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  business?: { name: string; slug: string; logoUrl?: string };
  userName?: string;
  onLogout: () => void;
}) {
  const { theme, toggleTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [invite, setInvite] = useState(false);
  const bookingUrl = business ? `${window.location.origin}/book/${business.slug}` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy your booking link", bookingUrl);
    }
  }

  return (
    <>
      <BottomSheet open={open} onClose={onClose} label="More">
        <div className="px-4 pb-4 pt-2">
          {business && (
            <div className="flex items-center gap-3 px-1">
              {business.logoUrl ? (
                <img src={imageSrc(business.logoUrl)} alt="" className="h-12 w-12 rounded-2xl object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-lg font-bold text-highlight">{business.name.charAt(0)}</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-stone-900">{business.name}</p>
                <p className="truncate text-sm text-stone-500">{userName}</p>
              </div>
              <a href={bookingUrl} target="_blank" rel="noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-stone-600" aria-label="Open booking page">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          )}

          <div className="mt-5 grid grid-cols-3 gap-2">
            {DESTINATIONS.map((item) => {
              const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={`flex flex-col items-center gap-2 rounded-2xl border px-2 py-4 text-center transition-colors ${
                    active ? "border-stone-900 bg-stone-50 dark:border-stone-500" : "border-stone-200 active:bg-stone-50"
                  }`}
                >
                  <item.icon className="h-5 w-5 text-stone-800" strokeWidth={1.75} aria-hidden="true" />
                  <span className="text-[13px] font-medium text-stone-800">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {business && (
            <div className="mt-4 rounded-2xl bg-stone-50 p-3.5">
              <p className="text-xs text-stone-500">Your booking link</p>
              <p className="mt-0.5 truncate font-mono text-[13px] text-stone-800">/book/{business.slug}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={copy} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-surface text-sm font-medium text-stone-800">
                  {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setInvite(true);
                  }}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-ink text-sm font-semibold text-white dark:bg-highlight dark:text-ink"
                >
                  <Send className="h-4 w-4" aria-hidden="true" /> Share
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200">
            <button type="button" onClick={toggleTheme} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-stone-800">
              {theme === "dark" ? <Sun className="h-5 w-5 text-stone-600" strokeWidth={1.75} aria-hidden="true" /> : <Moon className="h-5 w-5 text-stone-600" strokeWidth={1.75} aria-hidden="true" />}
              <span className="flex-1">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
              <span className={`relative h-6 w-10 rounded-full transition-colors ${theme === "dark" ? "bg-brand-600" : "bg-stone-200"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${theme === "dark" ? "translate-x-[18px]" : "translate-x-0.5"}`} />
              </span>
            </button>
            <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-red-600">
              <LogOut className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>
      </BottomSheet>
      {invite && business && <InviteCustomersModal slug={business.slug} businessName={business.name} initialKind="book" onClose={() => setInvite(false)} />}
    </>
  );
}
