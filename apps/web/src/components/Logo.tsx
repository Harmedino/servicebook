import { Link } from "react-router-dom";

/**
 * ServiceBook brand mark: two booked time slots, offset so they read as an "S".
 * `onDark` lifts the tile off ink backgrounds (header, sidebar).
 */
export function LogoMark({ className = "h-8 w-8", onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill={onDark ? "#1b3528" : "#0c1a14"} />
      <rect x="13" y="16" width="28" height="13" rx="6.5" fill="#fff" />
      <rect x="23" y="35" width="28" height="13" rx="6.5" fill="#c5f36b" />
    </svg>
  );
}

interface LogoProps {
  to?: string;
  /** "light" for use on dark ink backgrounds (header, sidebar, dark sections). */
  tone?: "default" | "light";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { mark: "h-7 w-7", text: "text-[1.05rem]" },
  md: { mark: "h-8 w-8", text: "text-lg" },
  lg: { mark: "h-10 w-10", text: "text-2xl" },
};

export function Logo({ to = "/", tone = "default", size = "md", className = "" }: LogoProps) {
  const content = (
    <>
      <LogoMark className={`${SIZES[size].mark} shrink-0`} onDark={tone === "light"} />
      <span className={`font-display font-bold tracking-tight ${SIZES[size].text} ${tone === "light" ? "text-white" : "text-stone-900"}`}>
        ServiceBook
      </span>
    </>
  );
  return to ? (
    <Link to={to} className={`inline-flex items-center gap-2.5 ${className}`}>
      {content}
    </Link>
  ) : (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>{content}</span>
  );
}
