import { useEffect, useState, type FormEvent } from "react";
import { MessagesSquare } from "lucide-react";
import type { SocialChannel, SocialLinks } from "@servicebook/types";
import { useMyBusiness, useUpdateBusiness } from "../lib/business";
import { ApiError } from "../lib/apiClient";
import { CHANNELS } from "../lib/socials";
import { SocialIcon } from "./SocialIcon";
import { Button } from "./ui/Button";

const PREFIX: Record<SocialChannel, string> = {
  whatsapp: "+",
  instagram: "@",
  facebook: "m.me/",
  tiktok: "@",
  x: "@",
  telegram: "t.me/",
  snapchat: "@",
};

/** Settings → Chat apps: the handles behind the booking page's "Chat with us" buttons. */
export function SocialLinksSection() {
  const { data, isPending: isLoading } = useMyBusiness();
  const updateBusiness = useUpdateBusiness();
  const [values, setValues] = useState<SocialLinks>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.business) setValues(data.business.socials ?? {});
  }, [data?.business]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    try {
      // Send every channel so clearing a field removes it.
      const socials = Object.fromEntries(CHANNELS.map((channel) => [channel.id, values[channel.id]?.trim() ?? ""])) as SocialLinks;
      const result = await updateBusiness.mutateAsync({ socials });
      setValues(result.business.socials ?? {});
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Couldn't save. Please try again.");
    }
  }

  if (isLoading) return <p className="text-sm text-stone-500">Loading…</p>;

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-lg space-y-5">
      <div className="flex gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-stone-700">
        <MessagesSquare className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
        <p>
          Customers see a <strong>Chat with us</strong> button on your booking page. Before we open the app, they leave their name, number and what
          they need, so every conversation lands in your <strong>Inbox</strong> with a reference code, even if they only DM you.
        </p>
      </div>

      <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-surface">
        {CHANNELS.map((channel) => (
          <label key={channel.id} className="flex items-center gap-3 p-3 sm:p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: channel.color, color: channel.onColor }}>
              <SocialIcon icon={channel.icon} className="h-5 w-5" />
            </span>
            <span className="w-24 shrink-0 text-sm font-medium text-stone-800">{channel.label}</span>
            <span className="flex min-w-0 flex-1 items-center rounded-lg border border-stone-300 bg-surface focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/40">
              <span className="pl-3 text-sm text-stone-400">{PREFIX[channel.id]}</span>
              <input
                value={values[channel.id] ?? ""}
                onChange={(event) => setValues((current) => ({ ...current, [channel.id]: event.target.value }))}
                placeholder={channel.placeholder}
                inputMode={channel.id === "whatsapp" ? "tel" : "text"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent py-2 pl-1 pr-3 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none"
              />
            </span>
          </label>
        ))}
      </div>
      <p className="text-xs text-stone-500">
        Paste a username or a full profile link. For WhatsApp use the full number with country code. If you leave it empty, your business phone number is
        used.
      </p>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saved && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Saved. Your booking page shows these now.</p>}

      <Button type="submit" isLoading={updateBusiness.isPending}>
        {updateBusiness.isPending ? "Saving…" : "Save chat apps"}
      </Button>
    </form>
  );
}
