import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Only for surfaces that genuinely float above the page (rare) — ordinary panels use a border, not a shadow. */
  elevated?: boolean;
}

export function Card({ className = "", elevated = false, children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-stone-200 bg-surface ${elevated ? "shadow-[var(--shadow-elevated)]" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
