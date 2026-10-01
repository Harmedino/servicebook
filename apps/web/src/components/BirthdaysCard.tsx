import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Cake, MessageCircle } from "lucide-react";
import type { UpcomingBirthdaysResponse } from "@servicebook/types";
import { apiRequest } from "../lib/apiClient";
import { useMyBusiness } from "../lib/business";
import { whatsappNumberFor } from "../lib/socials";
import { birthdayLabel } from "./BirthdayPicker";
import { Avatar } from "./ui/Avatar";

/** Dashboard: customers with a birthday this week, each with a ready-to-send WhatsApp wish. Hidden when there are none. */
export function BirthdaysCard() {
  const { data } = useQuery({
    queryKey: ["customers", "birthdays"],
    queryFn: () => apiRequest<UpcomingBirthdaysResponse>("/api/customers/birthdays?days=7"),
  });
  const { data: businessData } = useMyBusiness();
  const business = businessData?.business;
  const birthdays = data?.birthdays ?? [];
  if (birthdays.length === 0) return null;

  return (
    <section id="birthdays" className="scroll-mt-20 rounded-2xl border border-stone-200 bg-surface p-5">
      <p className="flex items-center gap-2 font-semibold text-stone-900">
        <Cake className="h-4 w-4 text-pink-500" aria-hidden="true" /> Birthdays this week
      </p>
      <ul className="mt-3 space-y-3">
        {birthdays.map((entry) => {
          const first = entry.name.split(" ")[0];
          const message = `Happy birthday, ${first}! Wishing you a lovely day from all of us at ${business?.name ?? "the salon"}.`;
          const whatsapp = entry.phone ? whatsappNumberFor(entry.phone, business?.socials?.whatsapp) : "";
          return (
            <li key={entry.customerId} className="flex items-center gap-3">
              <Avatar name={entry.name} size="sm" />
              <Link to={`/customers/${entry.customerId}`} className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-stone-900">{entry.name}</span>
                <span className={`block text-xs ${entry.daysAway === 0 ? "font-semibold text-pink-600" : "text-stone-500"}`}>
                  {entry.daysAway === 0 ? "Today" : entry.daysAway === 1 ? "Tomorrow" : birthdayLabel(entry.birthday)}
                </span>
              </Link>
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-stone-300 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> Send wishes
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
