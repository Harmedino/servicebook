import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { formatDistanceToNowStrict } from "date-fns";
import { AlertTriangle, Bell, BellOff, BellRing, CalendarCheck, CalendarX, Loader2, MessageCircle, MessagesSquare, Send, Smartphone, Star, UserPlus, X, type LucideIcon } from "lucide-react";
import type { NotificationProfile, NotificationType } from "@servicebook/types";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications, useSendTestNotification } from "../lib/notifications";
import { hasPushSubscription, isIosBrowser, showLocalNotification, useDeviceAlerts } from "../lib/push";
import { ApiError } from "../lib/apiClient";
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

/** On/off for alerts on this phone or computer, including when ServiceBook is closed. */
function DeviceAlerts() {
  const { state, error, turnOn, turnOff } = useDeviceAlerts();
  const [busy, setBusy] = useState(false);
  const run = (action: () => Promise<void>) => async () => {
    setBusy(true);
    await action();
    setBusy(false);
  };

  if (state === "loading") return null;

  let icon = <BellRing className="h-4 w-4" aria-hidden="true" />;
  let title = "Alerts on this device";
  let note = "Get a ping for new bookings and messages, even when ServiceBook is closed.";
  let action: ReactNode = (
    <button type="button" onClick={run(turnOn)} disabled={busy} className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 dark:bg-highlight dark:text-ink">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : "Turn on"}
    </button>
  );
  if (state === "on") {
    title = "Alerts are on for this device";
    note = "You'll get a notification even when ServiceBook is closed.";
    action = (
      <button type="button" onClick={run(turnOff)} disabled={busy} className="shrink-0 rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100">
        Turn off
      </button>
    );
  } else if (state === "blocked") {
    icon = <BellOff className="h-4 w-4" aria-hidden="true" />;
    title = "Alerts are blocked";
    note = "Allow notifications for this site in your browser settings (tap the icon left of the address bar), then reopen this.";
    action = null;
  } else if (state === "unsupported") {
    icon = <Smartphone className="h-4 w-4" aria-hidden="true" />;
    title = isIosBrowser() ? "Get alerts on your iPhone" : "This browser can't show alerts";
    note = isIosBrowser()
      ? "Tap Share, then \"Add to Home Screen\". Open ServiceBook from the home screen and turn alerts on there."
      : "Try Chrome, Edge, Firefox or Safari to get booking alerts.";
    action = null;
  }

  return (
    <div className={`mx-1 mb-2 rounded-xl px-3 py-2.5 ${state === "on" ? "bg-brand-50 dark:bg-brand-500/10" : "bg-stone-50"}`}>
      <div className="flex items-center gap-3">
        <span className={`shrink-0 ${state === "on" ? "text-brand-700" : "text-stone-600"}`}>{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-stone-900">{title}</span>
          <span className="block text-xs text-stone-500">{note}</span>
        </span>
        {action}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function PanelBody({ onClose }: { onClose: () => void }) {
  const { data, isPending, isError, error, refetch, isRefetching } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const sendTest = useSendTestNotification();
  const navigate = useNavigate();

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
      <DeviceAlerts />
      <div className="max-h-[60vh] overflow-y-auto">
        {isPending ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-shimmer h-12 rounded-xl bg-stone-100" />
            ))}
          </div>
        ) : isError && !data ? (
          <div className="px-4 py-8 text-center">
            <AlertTriangle className="mx-auto h-5 w-5 text-amber-500" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-stone-900">Couldn&apos;t load notifications</p>
            <p className="mt-1 text-xs text-stone-500">
              {error instanceof ApiError && error.status === 404
                ? "The server is running an older version. It should update within a few minutes of a deploy."
                : error instanceof Error
                  ? error.message
                  : "Please try again."}
            </p>
            <button type="button" onClick={() => void refetch()} disabled={isRefetching} className="mt-3 text-xs font-semibold text-stone-900 underline underline-offset-4">
              {isRefetching ? "Trying…" : "Try again"}
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-stone-500">
            When a customer books, messages, cancels, joins your list or leaves a review, it shows up here. Bookings you add yourself don&apos;t.
          </p>
        ) : (
          items.map((item) => <NotificationRow key={item.id} item={item} onOpen={open} />)
        )}
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 border-t border-stone-100 px-3 pt-2">
        <span className="text-[11px] text-stone-400">
          {sendTest.isSuccess
            ? sendTest.data.devices > 0
              ? `Sent to ${sendTest.data.devices} device${sendTest.data.devices === 1 ? "" : "s"}`
              : "Added above. Turn on alerts to get it on this device too."
            : sendTest.isError
              ? "Couldn't send. Try again."
              : "Check that alerts reach you"}
        </span>
        <button
          type="button"
          onClick={() => sendTest.mutate()}
          disabled={sendTest.isPending}
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-60"
        >
          {sendTest.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
          Send a test
        </button>
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
    // In a background tab, show a system notification, unless this device
    // already gets the same one by push from the server.
    if (document.hidden) {
      void hasPushSubscription().then((pushed) => {
        if (pushed) return;
        for (const n of fresh.slice(0, 3)) void showLocalNotification(n.title, { body: n.body, tag: n.id, link: n.link });
      });
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
