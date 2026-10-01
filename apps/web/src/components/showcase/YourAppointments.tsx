import { Link } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import { formatDistanceToNowStrict } from "date-fns";
import { ChevronRight, RotateCcw, Star } from "lucide-react";
import type { CustomerPortalResponse } from "@servicebook/types";
import { BookingStatusBadge } from "../ui/Badge";
import { brandSolid } from "../../lib/brand";

const SHOW_UPCOMING = 2;
const SHOW_PAST = 3;

/**
 * Top of the booking link's Book tab for a returning customer: what's coming
 * up, their last few visits with "Book again", and a way to their full page.
 */
export function YourAppointments({
  data,
  token,
  canRebook,
  onBookAgain,
  onForget,
}: {
  data: CustomerPortalResponse;
  token: string;
  canRebook: (serviceId: string) => boolean;
  onBookAgain: (serviceId: string, staffId: string) => void;
  onForget: () => void;
}) {
  const { customer, business, upcoming, past } = data;
  const timezone = business.timezone;
  const coming = upcoming
    .filter((appointment) => appointment.status !== "CANCELLED")
    .slice(0, SHOW_UPCOMING);
  const recent = past.slice(0, SHOW_PAST);
  const total = upcoming.length + past.length;

  return (
    <section
      aria-labelledby="your-appointments"
      className="mt-4 rounded-3xl border border-stone-200 bg-surface p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="your-appointments"
            className="text-lg font-semibold text-stone-900"
          >
            Welcome back, {customer.name.split(" ")[0]}
          </h2>
          <p className="mt-0.5 text-sm text-stone-500">
            {coming.length > 0
              ? "Here's what's coming up."
              : recent.length > 0
                ? "Book the same again, or pick something new below."
                : "Pick a service below to book."}
          </p>
        </div>
        <button
          type="button"
          onClick={onForget}
          className="shrink-0 text-xs font-medium text-stone-400 underline-offset-4 hover:text-stone-700 hover:underline"
        >
          Not you?
        </button>
      </div>

      {coming.length > 0 && (
        <ul className="mt-4 space-y-2">
          {coming.map((appointment) => {
            const start = new Date(appointment.startTime);
            return (
              <li key={appointment.accessToken}>
                <Link
                  to={`/my-booking/${appointment.accessToken}`}
                  className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3 transition-colors hover:bg-stone-100"
                >
                  <span
                    className={`flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5 ${brandSolid(business.brandColor)}`}
                  >
                    <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                      {formatInTimeZone(start, timezone, "MMM")}
                    </span>
                    <span className="font-display text-xl font-semibold leading-none">
                      {formatInTimeZone(start, timezone, "d")}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-stone-900">
                      {appointment.serviceName}
                    </span>
                    <span className="block truncate text-sm text-stone-500">
                      {formatInTimeZone(start, timezone, "EEE, h:mm a")}
                      {appointment.staffName
                        ? ` with ${appointment.staffName.split(" ")[0]}`
                        : ""}
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <BookingStatusBadge status={appointment.status} />
                      <span className="text-xs text-stone-400">
                        {formatDistanceToNowStrict(start, { addSuffix: true })}
                      </span>
                    </span>
                  </span>
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-stone-300"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {recent.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Past visits
          </h3>
          <ul className="mt-1 divide-y divide-stone-100">
            {recent.map((appointment) => {
              const done = appointment.status === "COMPLETED";
              return (
                <li
                  key={appointment.accessToken}
                  className="flex items-center gap-3 py-3"
                >
                  <Link
                    to={`/my-booking/${appointment.accessToken}`}
                    className="min-w-0 flex-1"
                  >
                    <span className="block truncate text-sm font-semibold text-stone-900">
                      {appointment.serviceName}
                    </span>
                    <span className="block truncate text-xs text-stone-500">
                      {formatInTimeZone(
                        new Date(appointment.startTime),
                        timezone,
                        "d MMM yyyy",
                      )}
                      {appointment.staffName
                        ? ` · ${appointment.staffName.split(" ")[0]}`
                        : ""}
                    </span>
                    {done && appointment.rating ? (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-stone-600">
                        <Star
                          className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                          aria-hidden="true"
                        />{" "}
                        You rated it {appointment.rating}
                      </span>
                    ) : done && appointment.canReview ? (
                      <span className="mt-1 block text-xs font-semibold text-amber-700">
                        Rate this visit
                      </span>
                    ) : !done ? (
                      <span className="mt-1 block">
                        <BookingStatusBadge status={appointment.status} />
                      </span>
                    ) : null}
                  </Link>
                  {canRebook(appointment.serviceId) && (
                    <button
                      type="button"
                      onClick={() =>
                        onBookAgain(appointment.serviceId, appointment.staffId)
                      }
                      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-stone-300 px-3 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                      Book again
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {total > coming.length + recent.length && (
        <Link
          to={`/c/${token}`}
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900"
        >
          See all {total} appointments{" "}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
