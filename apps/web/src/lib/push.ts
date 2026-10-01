import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "./apiClient";

export type DeviceAlertState =
  | "loading"
  /** No service worker or Push API (e.g. iPhone Safari outside the home screen app). */
  | "unsupported"
  | "off"
  | "on"
  /** The person said no; only the browser's site settings can undo it. */
  | "blocked";

const supported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** iPhones only allow web push once the site is added to the home screen. */
export const isIosBrowser = () =>
  typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.matchMedia("(display-mode: standalone)").matches;

/** Registers /sw.js once per page load. Safe to call many times. */
let registration: Promise<ServiceWorkerRegistration | null> | null = null;
export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!supported()) return Promise.resolve(null);
  registration ??= navigator.serviceWorker.register("/sw.js").catch((error) => {
    console.warn("Service worker not registered:", error);
    return null;
  });
  return registration;
}

function base64UrlToBytes(value: string): ArrayBuffer {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)).buffer as ArrayBuffer;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await registerServiceWorker();
  return reg ? reg.pushManager.getSubscription() : null;
}

function friendlyPushError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (/permission denied|incognito|private/i.test(message)) {
    return "This browser won't allow alerts here. Private or incognito windows can't get them; try a normal window.";
  }
  if (/push service|network|fetch/i.test(message)) return "Couldn't reach the browser's alert service. Check your connection and try again.";
  return message || "Couldn't turn on alerts. Please try again.";
}

/** Turns phone/computer alerts on or off for this device. */
export function useDeviceAlerts() {
  const [state, setState] = useState<DeviceAlertState>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supported()) return setState("unsupported");
    if (Notification.permission === "denied") return setState("blocked");
    const subscription = await currentSubscription();
    if (subscription && Notification.permission === "granted") {
      // Re-send so a device that was cleared server-side gets re-added.
      void apiRequest("/api/notifications/push-subscriptions", { method: "POST", body: subscription.toJSON() }).catch(() => undefined);
      setState("on");
    } else {
      setState("off");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const turnOn = useCallback(async () => {
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }
      const reg = await registerServiceWorker();
      if (!reg) throw new Error("This browser can't receive alerts.");
      await navigator.serviceWorker.ready;
      const { publicKey } = await apiRequest<{ publicKey: string }>("/api/notifications/push-key");
      const subscription =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) }));
      await apiRequest("/api/notifications/push-subscriptions", { method: "POST", body: subscription.toJSON() });
      setState("on");
    } catch (err) {
      setError(friendlyPushError(err));
      setState("off");
    }
  }, []);

  const turnOff = useCallback(async () => {
    setError(null);
    const subscription = await currentSubscription();
    if (subscription) {
      await apiRequest("/api/notifications/push-subscriptions", { method: "DELETE", body: { endpoint: subscription.endpoint } }).catch(() => undefined);
      await subscription.unsubscribe();
    }
    setState("off");
  }, []);

  return { state, error, turnOn, turnOff };
}

/**
 * Shows a system notification from the page itself. Uses the service worker
 * because Chrome on Android doesn't allow `new Notification()`.
 */
export async function showLocalNotification(title: string, options: { body?: string; tag?: string; link?: string }): Promise<void> {
  if (!supported() || Notification.permission !== "granted") return;
  const reg = await registerServiceWorker();
  if (!reg) return;
  await reg.showNotification(title, { body: options.body, tag: options.tag, icon: "/icon-192.png", badge: "/badge-96.png", data: { link: options.link } });
}

/** True when this device already gets server push, so the page shouldn't show a second copy. */
export async function hasPushSubscription(): Promise<boolean> {
  if (!supported() || Notification.permission !== "granted") return false;
  return Boolean(await currentSubscription());
}
