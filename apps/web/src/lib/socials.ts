import { siFacebook, siInstagram, siSnapchat, siTelegram, siTiktok, siWhatsapp, siX, type SimpleIcon } from "simple-icons";
import type { SocialChannel, SocialLinks } from "@servicebook/types";

export interface ChannelMeta {
  id: SocialChannel;
  label: string;
  icon: SimpleIcon;
  /** Brand colour for the icon tile. */
  color: string;
  /** Text colour on top of `color`. */
  onColor: string;
  placeholder: string;
  /** Whether the app accepts a pre-filled message in the link; otherwise we copy it for the customer. */
  prefill: boolean;
  url: (handle: string, text: string) => string;
}

export const CHANNELS: ChannelMeta[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: siWhatsapp,
    color: "#25D366",
    onColor: "#ffffff",
    placeholder: "2348035550100",
    prefill: true,
    url: (handle, text) => `https://wa.me/${handle}?text=${encodeURIComponent(text)}`,
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: siInstagram,
    color: "#E1306C",
    onColor: "#ffffff",
    placeholder: "glowstudio.lekki",
    prefill: false,
    url: (handle) => `https://ig.me/m/${handle}`,
  },
  {
    id: "facebook",
    label: "Messenger",
    icon: siFacebook,
    color: "#0866FF",
    onColor: "#ffffff",
    placeholder: "GlowStudioLekki",
    prefill: false,
    url: (handle) => `https://m.me/${handle}`,
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: siTiktok,
    color: "#000000",
    onColor: "#ffffff",
    placeholder: "glowstudio",
    prefill: false,
    url: (handle) => `https://www.tiktok.com/@${handle}`,
  },
  {
    id: "x",
    label: "X",
    icon: siX,
    color: "#000000",
    onColor: "#ffffff",
    placeholder: "glowstudio",
    prefill: false,
    url: (handle) => `https://x.com/${handle}`,
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: siTelegram,
    color: "#26A5E4",
    onColor: "#ffffff",
    placeholder: "glowstudio",
    prefill: true,
    url: (handle, text) => `https://t.me/${handle}?text=${encodeURIComponent(text)}`,
  },
  {
    id: "snapchat",
    label: "Snapchat",
    icon: siSnapchat,
    color: "#FFFC00",
    onColor: "#000000",
    placeholder: "glowstudio",
    prefill: false,
    url: (handle) => `https://www.snapchat.com/add/${handle}`,
  },
];

export const CHANNEL_BY_ID = Object.fromEntries(CHANNELS.map((channel) => [channel.id, channel])) as Record<SocialChannel, ChannelMeta>;

/** Channels the business has filled in, in display order. */
export function activeChannels(socials: SocialLinks | undefined): Array<ChannelMeta & { handle: string }> {
  return CHANNELS.flatMap((channel) => (socials?.[channel.id] ? [{ ...channel, handle: socials[channel.id] as string }] : []));
}

/**
 * A customer's number in wa.me form. Local numbers ("0803…") borrow the
 * country code from the business's own WhatsApp number when it has one.
 */
export function whatsappNumberFor(phone: string, businessWhatsapp?: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("0") && businessWhatsapp?.startsWith("234")) return `234${digits.slice(1)}`;
  return digits;
}
