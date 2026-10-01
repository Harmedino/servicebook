import { useState } from "react";
import { imageSrc } from "../lib/images";

interface ServiceThumbProps {
  name: string;
  imageUrl?: string;
  /** Tailwind size + radius classes. */
  className?: string;
}

/**
 * The service's own photo. Without one (or if it fails to load) nothing is
 * shown: a guessed icon or letters would say nothing true about the service.
 */
export function ServiceThumb({ name, imageUrl, className = "h-11 w-11 rounded-xl" }: ServiceThumbProps) {
  const [failed, setFailed] = useState(false);
  const src = !failed ? imageSrc(imageUrl) : undefined;
  if (!src) return null;
  return <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} className={`shrink-0 object-cover ${className}`} />;
}
