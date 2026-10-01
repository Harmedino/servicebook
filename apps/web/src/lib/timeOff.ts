import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { TimeOffCreatedResponse, TimeOffInput, TimeOffListResponse, TimeOffProfile } from "@servicebook/types";
import { apiRequest } from "./apiClient";
import { addDaysToKey } from "./calendarDates";

const KEY = ["time-off"] as const;

/** Current, upcoming and last-30-days time off; ?staffId narrows to one person (plus business closures). */
export function useTimeOff(staffId?: string): UseQueryResult<TimeOffListResponse> {
  return useQuery({
    queryKey: [...KEY, staffId ?? "all"],
    queryFn: () => apiRequest<TimeOffListResponse>(`/api/time-off${staffId ? `?staffId=${staffId}` : ""}`),
  });
}

export function useCreateTimeOff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TimeOffInput) => apiRequest<TimeOffCreatedResponse>("/api/time-off", { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      // Free times change straight away.
      void queryClient.invalidateQueries({ queryKey: ["bookings", "available-slots"] });
    },
  });
}

export function useDeleteTimeOff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/api/time-off/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      void queryClient.invalidateQueries({ queryKey: ["bookings", "available-slots"] });
    },
  });
}

const dayLabel = (dateKey: string, pattern: string) => formatInTimeZone(new Date(`${dateKey}T12:00:00Z`), "UTC", pattern);

function clock(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h >= 12 ? "PM" : "AM"}`;
}

/** "Mon 5 Oct", "5 – 9 Oct", "Fri 2 Oct, 2 PM – 6 PM", "Fri 2 Oct 2 PM → Mon 5 Oct 10 AM". */
export function describeTimeOff(entry: Pick<TimeOffProfile, "allDay" | "startDate" | "endDate" | "startTime" | "endTime">): string {
  if (entry.allDay) {
    if (entry.startDate === entry.endDate) return dayLabel(entry.startDate, "EEE d MMM");
    const sameMonth = entry.startDate.slice(0, 7) === entry.endDate.slice(0, 7);
    return `${dayLabel(entry.startDate, sameMonth ? "d" : "d MMM")} – ${dayLabel(entry.endDate, "d MMM")}`;
  }
  const from = `${clock(entry.startTime ?? "00:00")}`;
  const to = `${clock(entry.endTime ?? "00:00")}`;
  if (entry.startDate === entry.endDate) return `${dayLabel(entry.startDate, "EEE d MMM")}, ${from} – ${to}`;
  return `${dayLabel(entry.startDate, "EEE d MMM")} ${from} → ${dayLabel(entry.endDate, "EEE d MMM")} ${to}`;
}

export interface DayBlock {
  key: string;
  startMinutes: number;
  endMinutes: number;
  label: string;
}

/**
 * The part of each time-off entry that falls on one calendar day, in minutes
 * from midnight (business time zone). With staffId, only that person's time
 * off and business closures; without, everything (labelled with the name).
 */
export function blocksForDay(entries: TimeOffProfile[], dateKey: string, timezone: string, staffId?: string): DayBlock[] {
  const dayStart = fromZonedTime(`${dateKey}T00:00:00`, timezone).getTime();
  const dayEnd = fromZonedTime(`${addDaysToKey(dateKey, 1)}T00:00:00`, timezone).getTime();
  const toMinutes = (instant: number) => {
    if (instant >= dayEnd) return 24 * 60;
    const [h, m] = formatInTimeZone(new Date(instant), timezone, "HH:mm").split(":").map(Number);
    return h * 60 + m;
  };
  return entries
    .filter((entry) => !staffId || !entry.staffId || entry.staffId === staffId)
    .flatMap((entry) => {
      const start = Math.max(new Date(entry.startAt).getTime(), dayStart);
      const end = Math.min(new Date(entry.endAt).getTime(), dayEnd);
      if (start >= end) return [];
      const who = entry.staffId ? (staffId ? "Off" : `${(entry.staffName ?? "Staff").split(" ")[0]} off`) : "Closed";
      return [{ key: entry.id, startMinutes: toMinutes(start), endMinutes: toMinutes(end), label: entry.note && staffId ? `${who} · ${entry.note}` : who }];
    });
}
