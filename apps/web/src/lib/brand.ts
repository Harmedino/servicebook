import type { CSSProperties } from "react";

/** Colours an owner can pick with one tap. Any #rrggbb works too. */
export const BRAND_PRESETS = ["#0c1a14", "#1f6f5c", "#14532d", "#1e3a8a", "#6d28d9", "#9d174d", "#b45309", "#7c2d12", "#111827"];

function luminance(hex: string): number {
  const channel = (index: number) => {
    const value = parseInt(hex.slice(index, index + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** Text colour that stays readable on the brand colour. */
export function inkOn(hex: string): string {
  return luminance(hex) > 0.45 ? "#0c1a14" : "#ffffff";
}

/**
 * CSS variables for a business's colour: --accent and --accent-ink. Pages
 * use the `brand*` class helpers below, which fall back to the default look
 * when the business hasn't picked a colour.
 */
export function brandStyle(color?: string): CSSProperties | undefined {
  if (!color) return undefined;
  return { "--accent": color, "--accent-ink": inkOn(color) } as CSSProperties;
}

/** Solid surfaces: buttons, the active tab, the header band. */
export const brandSolid = (color: string | undefined, fallback = "bg-ink text-white dark:bg-highlight dark:text-ink") =>
  color ? "bg-[var(--accent)] text-[var(--accent-ink)]" : fallback;
