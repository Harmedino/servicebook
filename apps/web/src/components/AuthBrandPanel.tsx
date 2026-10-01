import { Check } from "lucide-react";
import { Logo } from "./Logo";
import { PHOTOS } from "./marketing/photos";

const POINTS = [
  "Your own booking link, live in five minutes",
  "Customers add themselves to your client list",
  "One calendar for every staff member, no double bookings",
];

/** The dark left panel shared by Login/Register, with a photo of a barber at work tucked into the corner. */
export function AuthBrandPanel({ headline, description }: { headline: string; description: string }) {
  const photo = PHOTOS.barberFade;
  return (
    <div className="relative hidden overflow-hidden bg-ink-grid lg:flex lg:w-1/2 lg:flex-col lg:p-10 xl:p-14">
      <Logo tone="light" />

      <div className="mt-14 max-w-md">
        <h2 className="text-4xl font-semibold leading-[1.1] tracking-tight text-white xl:text-[2.75rem]">{headline}</h2>
        <p className="mt-4 text-base text-white/60">{description}</p>
        <ul className="mt-8 space-y-3">
          {POINTS.map((point) => (
            <li key={point} className="flex items-start gap-3 text-sm text-white/80">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-highlight text-ink">
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <figure className="relative -mb-10 -mr-10 mt-auto pt-12 xl:-mb-14 xl:-mr-14">
        <img
          src={photo.src}
          srcSet={photo.srcSet}
          sizes="(min-width: 1280px) 50vw, 512px"
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          className="block aspect-[3/2] w-full rounded-tl-2xl object-cover"
        />
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-8 text-[11px] text-white/75">
          Photo:{" "}
          <a href={photo.credit.url} target="_blank" rel="noopener noreferrer" className="underline decoration-white/30 underline-offset-2 hover:text-white">
            {photo.credit.name}
          </a>{" "}
          on Pexels
        </figcaption>
      </figure>
    </div>
  );
}
