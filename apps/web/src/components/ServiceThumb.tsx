import { useState } from "react";
import { imageSrc } from "../lib/images";

// Quiet, earthy tiles for services without a photo; picked by name so each service keeps its colour.
const TONES = [
  "bg-[#e9e4da] text-[#5b4a2f]",
  "bg-[#dde7e0] text-[#2f5040]",
  "bg-[#e7dfe3] text-[#5a3848]",
  "bg-[#dfe3e8] text-[#34465a]",
  "bg-[#ece2d3] text-[#6b4a1f]",
];

function monogram(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "•";
}

function toneFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

interface ServiceThumbProps {
  name: string;
  imageUrl?: string;
  /** Tailwind size + radius classes. */
  className?: string;
}

/** The service's photo, or a two-letter monogram tile when it has none (or the image fails to load). */
export function ServiceThumb({ name, imageUrl, className = "h-11 w-11 rounded-xl" }: ServiceThumbProps) {
  const [failed, setFailed] = useState(false);
  const src = !failed ? imageSrc(imageUrl) : undefined;
  if (src) {
    return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className={`shrink-0 object-cover ${className}`} />;
  }
  return (
    <span className={`flex shrink-0 items-center justify-center font-display text-sm font-semibold tracking-tight ${toneFor(name)} ${className}`} aria-hidden="true">
      {monogram(name)}
    </span>
  );
}
