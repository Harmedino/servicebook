import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarOff, Plus, Store, Trash2 } from "lucide-react";
import type { TimeOffCreatedResponse, TimeOffProfile } from "@servicebook/types";
import { DashboardLayout } from "../components/DashboardLayout";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { CardListSkeleton } from "../components/ui/Skeleton";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Toggle } from "../components/Toggle";
import { FormPage } from "./FormPages";
import { describeTimeOff, useCreateTimeOff, useDeleteTimeOff, useTimeOff } from "../lib/timeOff";
import { useStaffList } from "../lib/staff";
import { useMyBusiness } from "../lib/business";
import { useOpenBooking } from "../lib/bookings";
import { ApiError } from "../lib/apiClient";

function Who({ entry }: { entry: TimeOffProfile }) {
  return entry.staffId ? (
    <Avatar name={entry.staffName ?? "Staff"} size="sm" />
  ) : (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-highlight">
      <Store className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

/** One time-off entry with a remove button. Used on the Time off page and staff pages. */
export function TimeOffRow({ entry, onRemove }: { entry: TimeOffProfile; onRemove: (entry: TimeOffProfile) => void }) {
  const now = Date.now();
  const current = new Date(entry.startAt).getTime() <= now && new Date(entry.endAt).getTime() > now;
  const past = new Date(entry.endAt).getTime() <= now;
  return (
    <li className={`flex items-center gap-3 py-3 ${past ? "opacity-60" : ""}`}>
      <Who entry={entry} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-stone-900">
          {entry.staffId ? entry.staffName : "Whole business closed"}
          {current && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Now</span>}
        </span>
        <span className="block truncate text-sm text-stone-600">{describeTimeOff(entry)}</span>
        {entry.note && <span className="block truncate text-xs text-stone-400">{entry.note}</span>}
      </span>
      {!past && (
        <button
          type="button"
          onClick={() => onRemove(entry)}
          aria-label="Remove time off"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </li>
  );
}

/** Remove-with-confirmation, shared by every list of time off. */
export function useRemoveTimeOff() {
  const remove = useDeleteTimeOff();
  const [pending, setPending] = useState<TimeOffProfile | null>(null);
  const dialog = pending && (
    <ConfirmDialog
      title="Remove this time off?"
      confirmLabel="Remove"
      destructive
      isConfirming={remove.isPending}
      onConfirm={() => remove.mutate(pending.id, { onSettled: () => setPending(null) })}
      onCancel={() => setPending(null)}
    >
      <p>
        {pending.staffId ? pending.staffName : "The whole business"} · {describeTimeOff(pending)}
      </p>
      <p>Those times can be booked again straight away.</p>
    </ConfirmDialog>
  );
  return { ask: setPending, dialog };
}

/** /time-off — everyone's days off and closures, now and coming up. */
export function TimeOffPage() {
  const { data, isPending } = useTimeOff();
  const navigate = useNavigate();
  const { ask, dialog } = useRemoveTimeOff();
  const entries = data?.timeOff ?? [];
  const now = Date.now();
  const upcoming = entries.filter((entry) => new Date(entry.endAt).getTime() > now);
  const recent = entries.filter((entry) => new Date(entry.endAt).getTime() <= now).reverse();
  const add = () => navigate("/time-off/new", { state: { from: "/time-off" } });

  return (
    <DashboardLayout>
      <PageHeader
        title="Time off"
        description="Days off, holidays and closures. Customers can't book those times, and they show on your calendar."
        actions={
          <Button onClick={add}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add time off
          </Button>
        }
      />
      <div className="mt-6 max-w-3xl">
        {isPending ? (
          <CardListSkeleton />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={CalendarOff}
            title="No time off planned"
            description="Going on holiday, closing for a public holiday, or someone needs an afternoon off? Add it here and those times disappear from your booking page."
            action={<Button onClick={add}>Add time off</Button>}
          />
        ) : (
          <div className="space-y-6">
            <section>
              <h2 className="text-sm font-semibold text-stone-900">Now and coming up</h2>
              {upcoming.length === 0 ? (
                <p className="mt-2 text-sm text-stone-500">Nothing planned.</p>
              ) : (
                <ul className="mt-2 divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-surface px-4">
                  {upcoming.map((entry) => (
                    <TimeOffRow key={entry.id} entry={entry} onRemove={ask} />
                  ))}
                </ul>
              )}
            </section>
            {recent.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-stone-500">Last 30 days</h2>
                <ul className="mt-2 divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-surface px-4">
                  {recent.map((entry) => (
                    <TimeOffRow key={entry.id} entry={entry} onRemove={ask} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
      {dialog}
    </DashboardLayout>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-surface px-3 py-2.5 text-base text-stone-900 sm:py-2 sm:text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40";

/** /time-off/new — ?staff= picks the person. */
export function NewTimeOffPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const { data: businessData } = useMyBusiness();
  const { data: staffData } = useStaffList();
  const create = useCreateTimeOff();
  const openBooking = useOpenBooking();
  const timezone = businessData?.business?.timezone ?? "UTC";
  const today = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const staff = (staffData?.staff ?? []).filter((member) => member.isActive);

  const [who, setWho] = useState(params.get("staff") ?? "");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("13:00");
  const [endTime, setEndTime] = useState("18:00");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TimeOffCreatedResponse | null>(null);
  const done = () => navigate(from ?? "/time-off", { replace: true });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (endDate < startDate) return setError("The last day can't be before the first day");
    if (!allDay && startDate === endDate && endTime <= startTime) return setError("The end time has to be after the start time");
    create.mutate(
      {
        staffId: who || undefined,
        startDate,
        endDate,
        startTime: allDay ? undefined : startTime,
        endTime: allDay ? undefined : endTime,
        note: note.trim() || undefined,
      },
      {
        onSuccess: (response) => (response.clashes.length ? setResult(response) : done()),
        onError: (err) => setError(err instanceof ApiError ? err.message : "Couldn't save. Please try again."),
      },
    );
  }

  if (result) {
    return (
      <FormPage backTo="/time-off" backLabel="Time off" title="Time off saved">
        <p className="text-sm text-stone-700">
          {result.clashes.length === 1 ? "One appointment is" : `${result.clashes.length} appointments are`} already booked in that time. They
          haven&apos;t been cancelled: move them, or let the customer know.
        </p>
        <ul className="mt-4 divide-y divide-stone-100 rounded-2xl border border-stone-200">
          {result.clashes.map((clash) => (
            <li key={clash.id}>
              <button type="button" onClick={() => openBooking(clash.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-stone-50">
                <span className="w-24 shrink-0 text-sm font-semibold tabular-nums text-stone-900">
                  {formatInTimeZone(new Date(clash.startTime), timezone, "EEE d, h:mm a")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-stone-900">{clash.customerName}</span>
                  <span className="block truncate text-xs text-stone-500">
                    {clash.serviceName} with {clash.staffName}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex justify-end">
          <Button onClick={done}>Done</Button>
        </div>
      </FormPage>
    );
  }

  return (
    <FormPage
      backTo="/time-off"
      backLabel="Time off"
      title="Add time off"
      description="Customers won't be offered these times. Nothing already booked is cancelled; you'll be told about anything that clashes."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div>
          <span className="text-sm font-medium text-stone-700">Who</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {[{ id: "", name: "Whole business" }, ...staff].map((member) => (
              <button
                key={member.id || "all"}
                type="button"
                onClick={() => setWho(member.id)}
                aria-pressed={who === member.id}
                className={`inline-flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm font-medium transition-colors ${
                  who === member.id ? "border-brand-600 bg-brand-50 text-brand-900 ring-1 ring-brand-600" : "border-stone-200 text-stone-700 hover:border-stone-300"
                }`}
              >
                {member.id ? (
                  <Avatar name={member.name} size="sm" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-highlight">
                    <Store className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
                {member.id ? member.name.split(" ")[0] : member.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-stone-700">From</span>
            <input
              type="date"
              value={startDate}
              min={today}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (e.target.value > endDate) setEndDate(e.target.value);
              }}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Until (last day)</span>
            <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
          </label>
        </div>

        <div className="rounded-2xl bg-stone-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium text-stone-900">All day</span>
              <span className="block text-xs text-stone-500">Turn off to block only some hours.</span>
            </span>
            <Toggle checked={allDay} onChange={setAllDay} label="All day" />
          </div>
          {!allDay && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-stone-700">From {startDate === endDate ? "" : "(first day)"}</span>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Until {startDate === endDate ? "" : "(last day)"}</span>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} />
              </label>
            </div>
          )}
        </div>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            Note <span className="font-normal text-stone-400">· only your team sees this</span>
          </span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Holiday, training, public holiday…" className={inputClass} />
        </label>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={done}>
            Cancel
          </Button>
          <Button type="submit" isLoading={create.isPending}>
            Save time off
          </Button>
        </div>
      </form>
      <p className="mt-4 text-xs text-stone-400">
        Regular days off, like closing every Sunday, belong in <Link to="/settings" className="underline">opening hours</Link> or the person&apos;s weekly hours instead.
      </p>
    </FormPage>
  );
}
