import { useState } from "react";
import { Star } from "lucide-react";

/** Read-only stars, filled to the nearest half. */
export function Stars({ value, className = "h-3.5 w-3.5" }: { value: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, value - n + 1));
        return (
          <span key={n} className="relative inline-block">
            <Star className={`${className} text-stone-300`} aria-hidden="true" />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill >= 0.75 ? 100 : fill >= 0.25 ? 50 : 0}%` }}>
                <Star className={`${className} fill-amber-400 text-amber-400`} aria-hidden="true" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/** "★ 4.8 (12)" — compact badge for chips and cards. Nothing when unrated. */
export function RatingBadge({ rating, count, className = "" }: { rating?: number; count?: number; className?: string }) {
  if (!rating || !count) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold text-stone-700 ${className}`}>
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
      {rating.toFixed(1)}
      <span className="font-normal text-stone-400">({count})</span>
    </span>
  );
}

const LABELS = ["", "Not good", "Could be better", "Okay", "Good", "Loved it"];

/** Tap-to-rate input. */
export function StarInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div>
      <div className="flex gap-1.5" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            className="rounded-lg p-0.5 transition-transform active:scale-90"
          >
            <Star className={`h-9 w-9 transition-colors ${n <= shown ? "fill-amber-400 text-amber-400" : "text-stone-300"}`} aria-hidden="true" />
          </button>
        ))}
      </div>
      <p className="mt-1 h-5 text-sm font-medium text-stone-600">{LABELS[shown]}</p>
    </div>
  );
}
