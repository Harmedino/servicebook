import { useState } from "react";
import { Hand, Heart, Scissors, Sparkles, Wand2 } from "lucide-react";
import { imageSrc } from "../lib/images";

// A friendly icon per service, guessed from its name, for services without a photo.
const SERVICE_ICONS: Array<{ match: RegExp; icon: typeof Scissors; tone: string }> = [
  { match: /cut|trim|beard|barb|fade|line/i, icon: Scissors, tone: "bg-sky-50 text-sky-700" },
  { match: /nail|mani|pedi|gel/i, icon: Hand, tone: "bg-rose-50 text-rose-700" },
  { match: /makeup|glam|brow|lash|face/i, icon: Wand2, tone: "bg-orange-50 text-orange-700" },
  { match: /massage|spa|therapy|body/i, icon: Heart, tone: "bg-brand-50 text-brand-700" },
  { match: /braid|hair|wash|color|colour|style|wig|locs/i, icon: Sparkles, tone: "bg-amber-50 text-amber-700" },
];

export function serviceIcon(name: string) {
  return SERVICE_ICONS.find((entry) => entry.match.test(name)) ?? { icon: Sparkles, tone: "bg-stone-100 text-stone-700" };
}

interface ServiceThumbProps {
  name: string;
  imageUrl?: string;
  /** Tailwind size + radius classes. */
  className?: string;
  iconClassName?: string;
}

/** The service's photo, or a tinted icon tile when it has none (or the image fails to load). */
export function ServiceThumb({ name, imageUrl, className = "h-11 w-11 rounded-xl", iconClassName = "h-5 w-5" }: ServiceThumbProps) {
  const [failed, setFailed] = useState(false);
  const src = !failed ? imageSrc(imageUrl) : undefined;
  if (src) {
    return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className={`shrink-0 object-cover ${className}`} />;
  }
  const { icon: Icon, tone } = serviceIcon(name);
  return (
    <span className={`flex shrink-0 items-center justify-center ${tone} ${className}`}>
      <Icon className={iconClassName} aria-hidden="true" />
    </span>
  );
}
