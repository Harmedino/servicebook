import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, Copy, Loader2, ShieldCheck, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import type { PublicBusinessProfile, PublicEnquiryInput, PublicEnquiryResponse, PublicServiceProfile, SocialChannel } from "@servicebook/types";
import { apiRequest, ApiError } from "../lib/apiClient";
import { activeChannels } from "../lib/socials";
import { useEscapeToClose } from "../lib/useEscapeToClose";
import { SocialIcon } from "./SocialIcon";

type Stage = "pick" | "details" | "ready";

interface ChatSheetProps {
  slug: string;
  business: PublicBusinessProfile;
  services: PublicServiceProfile[];
  onClose: () => void;
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-stone-300 bg-surface px-3.5 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40";

/**
 * "Chat with us": the customer picks an app, leaves their details (saved as
 * an enquiry in the owner's Inbox), then opens the chat with a message that
 * quotes the enquiry's reference.
 */
export function ChatSheet({ slug, business, services, onClose }: ChatSheetProps) {
  useEscapeToClose(onClose);
  const channels = activeChannels(business.socials);
  const [stage, setStage] = useState<Stage>("pick");
  const [channelId, setChannelId] = useState<SocialChannel | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const enquiry = useMutation({
    mutationFn: (input: PublicEnquiryInput & { company?: string }) =>
      apiRequest<PublicEnquiryResponse>(`/api/public/businesses/${slug}/enquiries`, { method: "POST", body: input, auth: false }),
  });

  const channel = channelId ? channels.find((entry) => entry.id === channelId) : undefined;
  const serviceName = services.find((service) => service.id === serviceId)?.name;
  const buildText = (reference: string) =>
    [`Hi ${business.name}! I'm ${name.trim()}.`, serviceName ? `I'm interested in ${serviceName}.` : "", message.trim(), `(Ref ${reference})`]
      .filter(Boolean)
      .join(" ");
  const chatText = enquiry.data ? buildText(enquiry.data.reference) : "";

  function pick(id: SocialChannel) {
    setChannelId(id);
    setError(null);
    setStage("details");
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(chatText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!channel) return;
    if (!name.trim()) return setError("Please enter your name");
    if (phone.replace(/[^\d]/g, "").length < 7) return setError("Please enter a valid phone number");
    setError(null);
    try {
      const result = await enquiry.mutateAsync({
        channel: channel.id,
        name: name.trim(),
        phone: phone.trim(),
        serviceId: serviceId || undefined,
        message: message.trim() || undefined,
        company: honeypot || undefined,
      });
      setStage("ready");
      // Pre-copy for apps that can't take a pre-filled message.
      navigator.clipboard?.writeText(buildText(result.reference)).then(
        () => setCopied(true),
        () => setCopied(false),
      );
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4" role="dialog" aria-modal="true" aria-labelledby="chat-title">
      <motion.div className="absolute inset-0 bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 30, stiffness: 340 }}
        className="pb-safe relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-5">
          {stage === "details" ? (
            <button type="button" onClick={() => setStage("pick")} className="-ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium text-stone-500 hover:bg-stone-100">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Apps
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {stage === "pick" && (
            <motion.div key="pick" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="px-5 pb-6">
              <h2 id="chat-title" className="text-xl font-semibold text-stone-900">
                Chat with {business.name}
              </h2>
              <p className="mt-1 text-sm text-stone-500">Pick the app you use. We&apos;ll pass your details on so they can help you faster.</p>
              <div className="mt-5 grid grid-cols-3 gap-2.5">
                {channels.map((entry, index) => (
                  <motion.button
                    key={entry.id}
                    type="button"
                    onClick={() => pick(entry.id)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    whileTap={{ scale: 0.96 }}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-stone-200 px-2 py-4 transition-colors hover:border-stone-300 hover:bg-stone-50"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: entry.color, color: entry.onColor }}>
                      <SocialIcon icon={entry.icon} className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-semibold text-stone-700">{entry.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {stage === "details" && channel && (
            <motion.form
              key="details"
              onSubmit={handleSubmit}
              noValidate
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              className="space-y-3.5 px-5 pb-6"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: channel.color, color: channel.onColor }}>
                  <SocialIcon icon={channel.icon} className="h-5 w-5" />
                </span>
                <div>
                  <h2 id="chat-title" className="text-lg font-semibold text-stone-900">
                    Before we open {channel.label}
                  </h2>
                  <p className="text-sm text-stone-500">So {business.name} knows who&apos;s messaging.</p>
                </div>
              </div>
              <label className="block text-sm font-medium text-stone-800">
                Your name
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputClass} placeholder="e.g. Chioma Okafor" />
              </label>
              <label className="block text-sm font-medium text-stone-800">
                Phone number
                <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" className={inputClass} placeholder="e.g. 0803 555 0100" />
              </label>
              {services.length > 0 && (
                <label className="block text-sm font-medium text-stone-800">
                  What&apos;s it about?
                  <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputClass}>
                    <option value="">A general question</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block text-sm font-medium text-stone-800">
                Message <span className="font-normal text-stone-400">(optional)</span>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} maxLength={1000} className={`${inputClass} resize-none`} placeholder="Do you have space this Saturday?" />
              </label>
              {/* Honeypot for bots; hidden from people and screen readers. */}
              <input value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" name="company" />
              {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <button
                type="submit"
                disabled={enquiry.isPending}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition hover:brightness-95 disabled:opacity-70"
                style={{ backgroundColor: channel.color, color: channel.onColor }}
              >
                {enquiry.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <SocialIcon icon={channel.icon} className="h-4 w-4" />}
                Continue to {channel.label}
              </button>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-stone-400">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Only shared with {business.name}
              </p>
            </motion.form>
          )}

          {stage === "ready" && channel && enquiry.data && (
            <motion.div key="ready" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="px-5 pb-6 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white">
                <Check className="h-7 w-7" strokeWidth={3} aria-hidden="true" />
              </span>
              <h2 id="chat-title" className="mt-4 text-xl font-semibold text-stone-900">
                {business.name} has your details
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Your reference is <span className="font-mono font-semibold text-stone-800">{enquiry.data.reference}</span>.
              </p>
              <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-3.5 text-left text-sm text-stone-700">{chatText}</div>
              {!channel.prefill && (
                <p className="mt-2 text-xs text-stone-500">
                  {copied ? `Message copied. Paste it in ${channel.label} after it opens.` : `${channel.label} can't pre-fill messages, so copy this first.`}
                </p>
              )}
              <div className="mt-4 grid gap-2">
                <a
                  href={channel.url(channel.handle, chatText)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition hover:brightness-95"
                  style={{ backgroundColor: channel.color, color: channel.onColor }}
                >
                  <SocialIcon icon={channel.icon} className="h-4 w-4" /> Open {channel.label}
                </a>
                <button type="button" onClick={copyText} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-300 text-sm font-medium text-stone-700 hover:bg-stone-50">
                  {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                  {copied ? "Copied" : "Copy message"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
