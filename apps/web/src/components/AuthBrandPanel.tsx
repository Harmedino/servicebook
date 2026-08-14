import { CheckCircle2 } from "lucide-react";
import { Avatar } from "./ui/Avatar";
import { Badge } from "./ui/Badge";

const ROWS = [
  { customer: "Sam Carter", service: "Haircut", time: "9:00 AM", status: "Confirmed" as const },
  { customer: "Priya Nair", service: "Beard trim", time: "10:30 AM", status: "Pending" as const },
];

/** The branded left panel shared by Login/Register — a small live-feeling product preview, no images. */
export function AuthBrandPanel({ headline, description }: { headline: string; description: string }) {
  return (
    <div className="relative hidden overflow-hidden bg-hero-mesh lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-10">
      <span className="relative z-10 text-lg font-semibold tracking-tight text-white">ServiceBook</span>

      <div className="relative z-10">
        <h2 className="max-w-sm text-3xl font-semibold tracking-tight text-white">{headline}</h2>
        <p className="mt-3 max-w-sm text-sm text-indigo-100/80">{description}</p>
      </div>

      <div className="relative z-10 mt-10 max-w-sm rounded-xl border border-white/10 bg-white/95 p-4 shadow-[var(--shadow-glow)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-900">Today&apos;s schedule</span>
          <span className="text-[11px] text-stone-400">3 appointments</span>
        </div>
        <ul className="mt-2 divide-y divide-stone-50">
          {ROWS.map((row) => (
            <li key={row.customer} className="flex items-center justify-between gap-2 py-2">
              <div className="flex items-center gap-2">
                <Avatar name={row.customer} size="xs" />
                <div>
                  <p className="text-xs font-medium text-stone-900">{row.customer}</p>
                  <p className="text-[11px] text-stone-500">
                    {row.service} · {row.time}
                  </p>
                </div>
              </div>
              <Badge tone={row.status === "Confirmed" ? "success" : "warning"}>{row.status}</Badge>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center gap-1.5 border-t border-stone-50 pt-2 text-[11px] text-stone-500">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
          Booking page live
        </div>
      </div>
    </div>
  );
}
