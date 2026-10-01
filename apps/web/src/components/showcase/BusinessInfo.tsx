import { Clock, Globe, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { PublicBusinessResponse } from "@servicebook/types";
import { describeTimeOff } from "../../lib/timeOff";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function clock(time?: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h >= 12 ? "PM" : "AM"}`;
}

/** The Info tab: what the business is, when it's open, how to get there and reach it. */
export function BusinessInfo({ data, todayDayOfWeek, onChat }: { data: PublicBusinessResponse; todayDayOfWeek: number; onChat?: () => void }) {
  const { business, hours, closures } = data;
  const week = [1, 2, 3, 4, 5, 6, 0].map((day) => hours.find((entry) => entry.dayOfWeek === day) ?? { dayOfWeek: day, isClosed: true });
  const row = "flex items-center gap-3 rounded-2xl border border-stone-200 bg-surface px-4 py-3.5 text-sm text-stone-800 transition-colors hover:bg-stone-50";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        {business.description && (
          <section>
            <h2 className="text-lg font-semibold text-stone-900">About {business.name}</h2>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-stone-600">{business.description}</p>
          </section>
        )}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-900">Find and contact us</h2>
          {business.address && (
            <a href={`https://maps.google.com/?q=${encodeURIComponent(business.address)}`} target="_blank" rel="noreferrer" className={row}>
              <MapPin className="h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />
              <span className="flex-1">{business.address}</span>
              <span className="shrink-0 text-xs font-semibold text-brand-700">Directions</span>
            </a>
          )}
          {business.phone && (
            <a href={`tel:${business.phone.replace(/\s/g, "")}`} className={row}>
              <Phone className="h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />
              <span className="flex-1">{business.phone}</span>
              <span className="shrink-0 text-xs font-semibold text-brand-700">Call</span>
            </a>
          )}
          {onChat && (
            <button type="button" onClick={onChat} className={`${row} w-full text-left`}>
              <MessageCircle className="h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />
              <span className="flex-1">Chat with us on WhatsApp, Instagram and more</span>
            </button>
          )}
          {business.email && (
            <a href={`mailto:${business.email}`} className={row}>
              <Mail className="h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />
              <span className="flex-1 truncate">{business.email}</span>
            </a>
          )}
          {business.website && (
            <a href={business.website} target="_blank" rel="noreferrer" className={row}>
              <Globe className="h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />
              <span className="flex-1 truncate">{business.website.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
        </section>
      </div>

      <section>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
          <Clock className="h-4 w-4 text-stone-400" aria-hidden="true" /> Opening hours
        </h2>
        {closures.length > 0 && (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="font-semibold text-amber-900 dark:text-amber-200">Closed</p>
            <ul className="mt-1 space-y-0.5 text-stone-700">
              {closures.map((entry) => (
                <li key={`${entry.startDate}-${entry.startTime ?? ""}`}>{describeTimeOff(entry)}</li>
              ))}
            </ul>
          </div>
        )}
        <ul className="mt-3 divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-surface px-4">
          {week.map((entry) => {
            const today = entry.dayOfWeek === todayDayOfWeek;
            return (
              <li key={entry.dayOfWeek} className={`flex justify-between gap-4 py-2.5 text-sm ${today ? "font-semibold text-stone-900" : "text-stone-600"}`}>
                <span>
                  {DAYS[entry.dayOfWeek]}
                  {today && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] text-brand-800">Today</span>}
                </span>
                <span className={entry.isClosed ? "text-stone-400" : ""}>{entry.isClosed ? "Closed" : `${clock(entry.openTime)} – ${clock(entry.closeTime)}`}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
