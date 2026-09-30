import { useState } from "react";
import { imageSrc } from "../../lib/images";
const PALETTE = [
  "bg-brand-100 text-brand-800",
  "bg-amber-100 text-amber-800",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-orange-50 text-orange-700",
  "bg-stone-200 text-stone-700",
  "bg-emerald-100 text-emerald-800",
];

const SIZE_CLASSES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function paletteIndexFor(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % PALETTE.length;
  }
  return Math.abs(hash);
}

interface AvatarProps {
  name: string;
  /** Photo URL or "/api/uploads/<id>"; falls back to initials if missing or broken. */
  src?: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function Avatar({ name, src, size = "md", className = "" }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const photo = !failed ? imageSrc(src) : undefined;
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        onError={() => setFailed(true)}
        className={`shrink-0 rounded-full object-cover ${SIZE_CLASSES[size]} ${className}`}
      />
    );
  }
  const colorClass = PALETTE[paletteIndexFor(name)];
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${SIZE_CLASSES[size]} ${colorClass} ${className}`}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}
