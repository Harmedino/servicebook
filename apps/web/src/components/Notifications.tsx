import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { formatDistanceToNowStrict } from "date-fns";
import { Bell, BellRing, CalendarCheck, CalendarX, MessageCircle, MessagesSquare, Star, UserPlus, X, type LucideIcon } from "lucide-react";
import type { NotificationProfile, NotificationType } from "@servicebook/types";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "../lib/notifications";
import { BottomSheet } from "./MobileSheets";

const ICONS: Record<NotificationType, LucideIcon> = {
  booking: CalendarCheck,
  cancellation: CalendarX,
  message: MessageCircle,
  enquiry: MessagesSquare,
  signup: UserPlus,
  review: Star,
};

function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setDesktop(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return desktop;
}

function NotificationRow({ item, onOpen }: { item: NotificationProfile; onOpen: (item: NotificationProfile) => void }) {
  const Icon = ICONS[item.type];
  return (
    <button type="button" onClick={() => onOpen(item)} className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-stone-50">
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.read ? "bg-stone-100 text-stone-500" : "bg-ink text-highlight dark:bg-brand-700 dark:text-white"}`}>
        <Icon className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm ${item.read ? "text-stone-700" : "font-semibold text-stone-900"}`}>{item.title}</span>
        {item.body && <span className="mt-0.5 block truncate text-xs text-stone-500">{item.body}</span>}
        <span className="mt-1 block text-[11px] text-stone-400">{formatDistanceToNowStrict(new Date(item.createdAt), { addSuffix: true })}</span>
      </span>
      {!item.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
    </button>
  );
}

function PanelBody({ onClose }: { onClose: () => void }) {
  const { data, isPending } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const navigate = useNavigate();
  const [permission, setPermission] = useState(() => ("Notification" in window ? Notification.permission : "denied"));

  function open(item: NotificationProfile) {
    if (!item.read) markRead.mutate(item.id);
    onClose();
    if (item.link) navigate(item.link);
  }

  const items = data?.notifications ?? [];

  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-1">
        <p className="font-semibold text-stone-900">Notifications</p>
        {(data?.unread ?? 0) > 0 && (
          <button type="button" onClick={() => markAll.mutate()} className="text-xs font-semibold text-stone-600 hover:text-stone-900">
            Mark all as read
          </button>
        )}
      </div>
      {permission === "default" && (
        <button
          type="button"
          onClick={() => void Notification.requestPermission().then(setPermission)}
          className="mx-1 mb-2 flex w-[calc(100%-0.5rem)] items-center gap-3 rounded-xl bg-stone-50 px-3 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-100"
        >
          <BellRing className="h-4 w-4 shrink-0 text-stone-600" aria-hidden="true" />
          <span>
            <span className="block font-medium text-stone-900">Get alerts on this device</span>
            <span className="block text-xs text-stone-500">Even when ServiceBook is in another tab.</span>
          </span>
        </button>
      )}
      <div className="max-h-[60vh] overflow-y-auto">
        {isPending ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-shimmer h-12 rounded-xl bg-stone-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-stone-500">New bookings, messages and sign-ups will show up here.</p>
        ) : (
          items.map((item) => <NotificationRow key={item.id} item={item} onOpen={open} />)
        )}
      </div>
    </div>
  );
}

/** Bell with unread count; a dropdown on desktop, a bottom sheet on phones. */
export function NotificationBell({ onDark = true }: { onDark?: boolean }) {
  const { data } = useNotifications();
  const [open, setOpen] = useState(false);
  const desktop = useIsDesktop();
  const panelRef = useRef<HTMLDivElement>(null);
  const unread = data?.unread ?? 0;

  useEffect(() => {
    if (!open || !desktop) return;
    const onDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, desktop]);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
          onDark ? "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white" : "border-stone-200 bg-surface text-stone-600 hover:bg-stone-100"
        }`}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-highlight px-1 text-[10px] font-bold text-ink ring-2 ring-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {desktop ? (
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-11 z-50 w-[360px] rounded-2xl border border-stone-200 bg-surface p-2 shadow-[var(--shadow-elevated)]"
            >
              <PanelBody onClose={() => setOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        <BottomSheet open={open} onClose={() => setOpen(false)} label="Notifications">
          <div className="px-2 pb-4">
            <PanelBody onClose={() => setOpen(false)} />
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

/**
 * Pops up anything that arrives while the dashboard is open, and sends a
 * device notification too when the tab is in the background.
 */
export function NotificationToasts() {
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const navigate = useNavigate();
  const seen = useRef<Set<string> | null>(null);
  const [toasts, setToasts] = useState<NotificationProfile[]>([]);

  useEffect(() => {
    if (!data) return;
    // The first load is history, not news.
    if (!seen.current) {
      seen.current = new Set(data.notifications.map((n) => n.id));
      return;
    }
    const fresh = data.notifications.filter((n) => !n.read && !seen.current?.has(n.id));
    fresh.forEach((n) => seen.current?.add(n.id));
    if (fresh.length === 0) return;
    setToasts((current) => [...fresh.slice(0, 3), ...current].slice(0, 3));
    if (document.hidden && "Notification" in window && Notification.permission === "granted") {
      for (const n of fresh.slice(0, 3)) new Notification(n.title, { body: n.body, tag: n.id, icon: "/favicon.svg" });
    }
  }, [data]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => setToasts((current) => current.slice(0, -1)), 6000);
    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-2 px-3 lg:inset-x-auto lg:right-4 lg:items-end" aria-live="polite">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-ink p-3.5 text-white shadow-[0_18px_40px_-16px_rgb(0_0_0/0.6)]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-highlight text-ink">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <button
                type="button"
                onClick={() => {
                  markRead.mutate(toast.id);
                  setToasts((current) => current.filter((t) => t.id !== toast.id));
                  if (toast.link) navigate(toast.link);
                }}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block text-sm font-semibold">{toast.title}</span>
                {toast.body && <span className="mt-0.5 block truncate text-xs text-white/60">{toast.body}</span>}
              </button>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setToasts((current) => current.filter((t) => t.id !== toast.id))}
                className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
