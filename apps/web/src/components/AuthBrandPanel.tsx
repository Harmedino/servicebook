import { Check } from "lucide-react";
import { Logo } from "./Logo";

const POINTS = [
  "Your own booking link, live in five minutes",
  "Customers add themselves to your client list",
  "One calendar for every staff member, no double bookings",
];

/** The dark left panel shared by Login/Register, with a real product screenshot bleeding off the corner. */
export function AuthBrandPanel({ headline, description }: { headline: string; description: string }) {
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

      <div className="relative -mb-10 -mr-10 mt-auto pt-12 xl:-mb-14 xl:-mr-14">
        <img
          src="/screens/dashboard.webp"
          alt="The ServiceBook dashboard"
          width={1440}
          height={900}
          className="w-[125%] max-w-none rounded-tl-xl border border-white/10 shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.6)]"
        />
      </div>
    </div>
  );
}
