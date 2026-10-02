import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarCheck, Check, Copy, Download, ExternalLink, MessageCircle, Share2, UserPlus, X } from "lucide-react";
import { useEscapeToClose } from "../lib/useEscapeToClose";
import { useCopyLink } from "./CopyLinkDialog";

type LinkKind = "join" | "book";

const LINKS: Record<LinkKind, { label: string; icon: typeof UserPlus; path: string; blurb: string; message: (name: string, url: string) => string }> = {
  join: {
    label: "Join link",
    icon: UserPlus,
    path: "join",
    blurb: "Customers add their own name and number to your client list. No typing it in for them.",
    message: (name, url) => `Hi! Please add your details to ${name}'s client list so we can reach you about appointments: ${url}`,
  },
  book: {
    label: "Booking link",
    icon: CalendarCheck,
    path: "book",
    blurb: "Customers pick a service, a staff member and a time, and it lands straight on your calendar.",
    message: (name, url) => `Book your next appointment with ${name} here: ${url}`,
  },
};

export function inviteUrl(kind: LinkKind, slug: string): string {
  return `${window.location.origin}/${LINKS[kind].path}/${slug}`;
}

interface InviteCustomersModalProps {
  slug: string;
  businessName: string;
  initialKind?: LinkKind;
  onClose: () => void;
}

/** Share a business's join or booking link: copy, WhatsApp, native share sheet, or a printable QR code. */
export function InviteCustomersModal({ slug, businessName, initialKind = "join", onClose }: InviteCustomersModalProps) {
  const [kind, setKind] = useState<LinkKind>(initialKind);
  const { copied, copy: copyLink, dialog: copyDialog } = useCopyLink();
  const [qr, setQr] = useState<string | null>(null);
  useEscapeToClose(onClose);

  const url = inviteUrl(kind, slug);
  const message = LINKS[kind].message(businessName, url);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    let cancelled = false;
    setQr(null);
    // Loaded on demand so the QR encoder stays out of the main bundle.
    import("qrcode")
      .then((QRCode) => QRCode.toDataURL(url, { width: 480, margin: 1, color: { dark: "#0c1a14", light: "#ffffff" } }))
      .then((data) => !cancelled && setQr(data))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [url]);

  async function copy() {
    await copyLink(url, "Copy this link");
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: businessName, text: message, url });
    } catch {
      // Dismissed share sheet; nothing to do.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4" role="dialog" aria-modal="true" aria-labelledby="invite-title">
      {copyDialog}
      <motion.div className="absolute inset-0 bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 30, stiffness: 340 }}
        className="pb-safe relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
          <div>
            <h2 id="invite-title" className="text-lg font-semibold text-stone-900">
              Share with customers
            </h2>
            <p className="mt-0.5 text-sm text-stone-500">Send it once on WhatsApp or print the QR for your front desk.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mx-5 mt-4 grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 sm:mx-6">
          {(Object.keys(LINKS) as LinkKind[]).map((key) => {
            const Icon = LINKS[key].icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setKind(key)}
                className={`relative flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
                  kind === key ? "text-stone-900" : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {kind === key && (
                  <motion.span layoutId="invite-tab" className="absolute inset-0 rounded-lg bg-surface shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 36 }} />
                )}
                <Icon className="relative h-4 w-4" aria-hidden="true" />
                <span className="relative">{LINKS[key].label}</span>
              </button>
            );
          })}
        </div>

        <div className="px-5 py-5 sm:px-6">
          <p className="text-sm text-stone-600">{LINKS[kind].blurb}</p>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 py-1.5 pl-3 pr-1.5">
            <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-stone-700">{url.replace(/^https?:\/\//, "")}</span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white transition active:scale-95 dark:bg-highlight dark:text-ink"
            >
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className={`mt-3 grid gap-2 ${canNativeShare ? "grid-cols-3" : "grid-cols-2"}`}>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#25d366] px-3 py-2.5 text-sm font-semibold text-[#073b1f] transition hover:brightness-95"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
            </a>
            {canNativeShare && (
              <button
                type="button"
                onClick={nativeShare}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                <Share2 className="h-4 w-4" aria-hidden="true" /> Share
              </button>
            )}
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> Preview
            </a>
          </div>

          <div className="mt-5 flex items-center gap-4 rounded-2xl border border-stone-200 p-4">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 ring-1 ring-stone-200">
              <AnimatePresence mode="wait">
                {qr ? (
                  <motion.img key={qr} src={qr} alt={`QR code for ${url}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full w-full" />
                ) : (
                  <motion.span key="loading" className="skeleton-shimmer h-full w-full rounded-lg bg-stone-100" />
                )}
              </AnimatePresence>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-900">QR code</p>
              <p className="mt-0.5 text-xs text-stone-500">Print it for your counter or mirror. Customers scan with their camera.</p>
              {qr && (
                <a
                  href={qr}
                  download={`${slug}-${LINKS[kind].path}-qr.png`}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
                >
                  <Download className="h-4 w-4" aria-hidden="true" /> Download PNG
                </a>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
