import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { formatDistanceToNowStrict } from "date-fns";
import { CalendarPlus, Check, ListOrdered, MessageCircle, X } from "lucide-react";
import type { WaitlistEntryProfile, WaitlistListResponse, WaitlistStatus } from "@servicebook/types";
import { apiRequest } from "../lib/apiClient";
import { useMyBusiness } from "../lib/business";
import { whatsappNumberFor } from "../lib/socials";
import { DashboardLayout } from "../components/DashboardLayout";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { CardListSkeleton } from "../components/ui/Skeleton";
import { Avatar } from "../components/ui/Avatar";

const KEY = ["waitlist"] as const;

export function useWaitlist(enabled = true) {
  return useQuery({ queryKey: KEY, queryFn: () => apiRequest<WaitlistListResponse>("/api/waitlist"), refetchInterval: 60_000, enabled });
}

/** /waitlist — people who want a fully booked day, grouped by that day. */
export function WaitlistPage() {
  const { data, isPending } = useWaitlist();
  const { data: businessData } = useMyBusiness();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const highlight = params.get("date");
  const business = businessData?.business;

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: WaitlistStatus }) => apiRequest(`/api/waitlist/${id}`, { method: "PATCH", body: { status } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: KEY }),
  });

  const byDate = useMemo(() => {
    const groups = new Map<string, WaitlistEntryProfile[]>();
    for (const entry of data?.entries ?? []) groups.set(entry.date, [...(groups.get(entry.date) ?? []), entry]);
    return [...groups.entries()];
  }, [data]);

  const day = (key: string) => formatInTimeZone(new Date(`${key}T12:00:00Z`), "UTC", "EEEE d MMMM");

  return (
    <DashboardLayout>
      <PageHeader
        title="Waitlist"
        description="Customers who wanted a fully booked day. When someone cancels you'll get a notification; offer the spot to whoever is first."
      />
      <div className="mt-6 max-w-3xl">
        {isPending ? (
          <CardListSkeleton />
        ) : byDate.length === 0 ? (
          <EmptyState
            icon={ListOrdered}
            title="Nobody waiting"
            description="When a day is fully booked, customers can join a waitlist from your booking page. They'll show up here."
          />
        ) : (
          <div className="space-y-6">
            {byDate.map(([date, entries]) => (
              <section key={date} className={highlight === date ? "rounded-3xl ring-2 ring-amber-300 ring-offset-4 ring-offset-paper" : ""}>
                <h2 className="text-sm font-semibold text-stone-900">
                  {day(date)} <span className="font-normal text-stone-500">· {entries.length} waiting</span>
                </h2>
                <ol className="mt-2 divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-surface">
                  {entries.map((entry, index) => {
                    const whatsapp = entry.customer.phone ? whatsappNumberFor(entry.customer.phone, business?.socials?.whatsapp) : "";
                    const message = `Hi ${entry.customer.name.split(" ")[0]}, a spot has opened at ${business?.name ?? "the salon"} on ${day(date)} for ${entry.serviceName}. Shall I book you in?`;
                    return (
                      <li key={entry.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-1 w-5 shrink-0 text-center text-sm font-semibold tabular-nums text-stone-400">{index + 1}</span>
                          <Avatar name={entry.customer.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-stone-900">{entry.customer.name}</p>
                            <p className="truncate text-sm text-stone-500">
                              {entry.serviceName}
                              {entry.staffName ? ` with ${entry.staffName.split(" ")[0]}` : " · anyone"} · {entry.customer.phone}
                            </p>
                            {entry.note && <p className="mt-1 text-sm text-stone-600">{entry.note}</p>}
                            <p className="mt-1 text-xs text-stone-400">Joined {formatDistanceToNowStrict(new Date(entry.createdAt), { addSuffix: true })}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 pl-8">
                          {whatsapp && (
                            <a
                              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#25D366] px-3 text-sm font-semibold text-white hover:brightness-95"
                            >
                              <MessageCircle className="h-4 w-4" aria-hidden="true" /> Offer the spot
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              update.mutate({ id: entry.id, status: "booked" });
                              navigate(`/bookings/new?customer=${entry.customer.id}&date=${date}`, { state: { from: "/waitlist" } });
                            }}
                            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
                          >
                            <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Book them
                          </button>
                          <button
                            type="button"
                            onClick={() => update.mutate({ id: entry.id, status: "booked" })}
                            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-stone-600 hover:bg-stone-100"
                          >
                            <Check className="h-4 w-4" aria-hidden="true" /> Sorted
                          </button>
                          <button
                            type="button"
                            onClick={() => update.mutate({ id: entry.id, status: "removed" })}
                            aria-label={`Remove ${entry.customer.name}`}
                            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
