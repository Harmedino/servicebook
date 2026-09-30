import type { SimpleIcon } from "simple-icons";

/** A brand logo from simple-icons, drawn in currentColor. */
export function SocialIcon({ icon, className = "h-4 w-4" }: { icon: SimpleIcon; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d={icon.path} />
    </svg>
  );
}
