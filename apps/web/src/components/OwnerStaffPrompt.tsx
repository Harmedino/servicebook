import { AnimatePresence, motion } from "motion/react";
import { UserRoundCheck } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { useOwnerStaff, useSetOwnerStaff } from "../lib/staff";
import { Avatar } from "./ui/Avatar";

/**
 * Asks the owner once whether they take appointments themselves. "Yes" adds
 * them as staff for every service in one tap, and "No" makes the question go away.
 * `always` keeps a smaller version visible (Staff page) while they aren't staff.
 */
export function OwnerStaffPrompt({ always = false, className = "" }: { always?: boolean; className?: string }) {
  const { user } = useAuth();
  const { data } = useOwnerStaff();
  const setOwnerStaff = useSetOwnerStaff();

  const visible = data && !data.staff && (always || !data.answered);

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          className={`overflow-hidden rounded-2xl border border-brand-200 bg-brand-50 ${className}`}
        >
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar name={user?.name ?? "You"} size="md" />
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white ring-2 ring-brand-50">
                  <UserRoundCheck className="h-3 w-3" aria-hidden="true" />
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-stone-900">Do you also serve customers yourself?</p>
                <p className="mt-0.5 text-sm text-stone-600">
                  Add yourself as staff and customers who don&apos;t pick anyone are booked with you by default.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2 sm:ml-auto">
              <button
                type="button"
                onClick={() => setOwnerStaff.mutate({ isStaff: true })}
                disabled={setOwnerStaff.isPending}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-70 sm:flex-none"
              >
                {setOwnerStaff.isPending ? "Adding…" : "Yes, add me"}
              </button>
              {!data.answered && (
                <button
                  type="button"
                  onClick={() => setOwnerStaff.mutate({ isStaff: false })}
                  disabled={setOwnerStaff.isPending}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-stone-300 bg-surface px-4 text-sm font-medium text-stone-700 transition hover:bg-stone-50 sm:flex-none"
                >
                  No, I just manage
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
