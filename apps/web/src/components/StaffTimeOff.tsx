import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useTimeOff } from "../lib/timeOff";
import { TimeOffRow, useRemoveTimeOff } from "../pages/TimeOffPage";
import { Card } from "./ui/Card";

/** On a staff member's page: their coming time off (and business closures), with a quick add. */
export function StaffTimeOff({ staffId, staffName }: { staffId: string; staffName: string }) {
  const { data } = useTimeOff(staffId);
  const { ask, dialog } = useRemoveTimeOff();
  const upcoming = (data?.timeOff ?? []).filter((entry) => new Date(entry.endAt).getTime() > Date.now());
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-stone-900">Time off</h2>
        <Link
          to={`/time-off/new?staff=${staffId}`}
          state={{ from: `/staff/${staffId}` }}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Add
        </Link>
      </div>
      {upcoming.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">Nothing planned. Add holidays or days off so {staffName.split(" ")[0]} can&apos;t be booked then.</p>
      ) : (
        <ul className="mt-1 divide-y divide-stone-100">
          {upcoming.map((entry) => (
            <TimeOffRow key={entry.id} entry={entry} onRemove={ask} />
          ))}
        </ul>
      )}
      {dialog}
    </Card>
  );
}
