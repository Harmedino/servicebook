import { z } from "zod";
import type { SocialChannel, SocialLinks } from "@servicebook/types";

export const SOCIAL_CHANNELS = ["whatsapp", "instagram", "facebook", "tiktok", "x", "telegram", "snapchat"] as const satisfies readonly SocialChannel[];

/**
 * Accepts whatever an owner pastes — "@glowstudio", "glowstudio" or a full
 * profile URL — and keeps just the handle. WhatsApp keeps digits only.
 */
function normalizeHandle(channel: SocialChannel, raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (channel === "whatsapp") return value.replace(/[^\d]/g, "");
  const fromUrl = value.match(/^(?:https?:\/\/)?(?:www\.|m\.)?[^/]+\.[a-z]+\/(?:add\/|@)?([^/?#]+)/i);
  return (fromUrl ? fromUrl[1] : value).replace(/^@/, "");
}

const handleField = (channel: SocialChannel) =>
  z
    .string()
    .max(200)
    .transform((value) => normalizeHandle(channel, value))
    .refine(
      (value) => value === "" || (channel === "whatsapp" ? /^\d{8,15}$/.test(value) : /^[A-Za-z0-9._-]{1,60}$/.test(value)),
      channel === "whatsapp" ? "Enter the WhatsApp number with country code, e.g. 2348035550100" : "Enter a username or profile link",
    );

export const socialLinksSchema = z.object(
  Object.fromEntries(SOCIAL_CHANNELS.map((channel) => [channel, handleField(channel).optional()])) as Record<
    SocialChannel,
    z.ZodOptional<ReturnType<typeof handleField>>
  >,
);

/** Only the channels that are actually filled in. */
export function toSocialLinks(stored: Partial<Record<SocialChannel, string | null | undefined>> | null | undefined): SocialLinks {
  const links: SocialLinks = {};
  for (const channel of SOCIAL_CHANNELS) {
    const value = stored?.[channel];
    if (value) links[channel] = value;
  }
  return links;
}
