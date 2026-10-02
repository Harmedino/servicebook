import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, RefreshCw } from "lucide-react";
import type { CalendarFeedResponse } from "@servicebook/types";
import { API_URL, apiRequest } from "../lib/apiClient";
import { useStaffList } from "../lib/staff";
import { FormPage } from "./FormPages";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Avatar } from "../components/ui/Avatar";
import { useCopyLink } from "../components/CopyLinkDialog";

const KEY = ["calendar-feed"] as const;

function feedUrl(token: string, staffId?: string) {
  return `${API_URL}/api/calendar/${token}.ics${staffId ? `?staff=${staffId}` : ""}`;
}

function FeedRow({ title, subtitle, url, avatar }: { title: string; subtitle: string; url: string; avatar?: string }) {
  const { copied, copy: copyLink, dialog: copyDialog } = useCopyLink();
  const webcal = url.replace(/^https?:\/\//, "webcal://");
  const google = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`;
  const outlook = `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(url)}&name=${encodeURIComponent(title)}`;
  const button = "inline-flex h-9 items-center rounded-full border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50";

  async function copy() {
    await copyLink(url, "Calendar link");
  }

  return (
    <li className="py-4">
      {copyDialog}
      <div className="flex items-center gap-3">
        {avatar && <Avatar name={avatar} size="sm" />}
        <div className="min-w-0">
          <p className="font-semibold text-stone-900">{title}</p>
          <p className="text-sm text-stone-500">{subtitle}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={google} target="_blank" rel="noreferrer" className={button}>
          Google Calendar
        </a>
        <a href={webcal} className={button}>
          Apple Calendar
        </a>
        <a href={outlook} target="_blank" rel="noreferrer" className={button}>
          Outlook
        </a>
        <button type="button" onClick={() => void copy()} className={`${button} gap-1.5`}>
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </li>
  );
}

/** /calendar/sync — subscribe from Google, Apple or Outlook so bookings show on your phone's calendar. */
export function CalendarSyncPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: KEY, queryFn: () => apiRequest<CalendarFeedResponse>("/api/calendar-feed") });
  const { data: staffData } = useStaffList();
  const [confirmReset, setConfirmReset] = useState(false);
  const reset = useMutation({
    mutationFn: () => apiRequest<CalendarFeedResponse>("/api/calendar-feed/reset", { method: "POST" }),
    onSuccess: (response) => queryClient.setQueryData(KEY, response),
  });
  const staff = (staffData?.staff ?? []).filter((member) => member.isActive);

  return (
    <FormPage
      backTo="/calendar"
      backLabel="Calendar"
      title="Sync to your calendar"
      description="Add your bookings to Google Calendar, Apple Calendar or Outlook. New bookings, changes and time off show up there on their own."
    >
      {!data ? (
        <div className="skeleton-shimmer h-40 rounded-2xl bg-stone-100" />
      ) : (
        <>
          <ul className="-my-4 divide-y divide-stone-100">
            <FeedRow title="Everyone's bookings" subtitle="The whole business, for you or the front desk." url={feedUrl(data.token)} />
            {staff.map((member) => (
              <FeedRow
                key={member.id}
                avatar={member.name}
                title={member.name}
                subtitle="Just their appointments and time off. Send it to them."
                url={feedUrl(data.token, member.id)}
              />
            ))}
          </ul>

          <div className="mt-6 space-y-2 rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">
            <p>
              <span className="font-semibold text-stone-900">On a phone:</span> tap Apple Calendar on an iPhone. On Android, open Google Calendar on a
              computer once, then it syncs to the phone.
            </p>
            <p>
              <span className="font-semibold text-stone-900">How quickly it updates</span> depends on the calendar app: Apple and Outlook check
              within minutes to an hour, Google can take a few hours.
            </p>
            <p>
              <span className="font-semibold text-stone-900">Keep these links private.</span> They include customers&apos; names and numbers.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Make new links (stops the old ones)
          </button>
        </>
      )}

      {confirmReset && (
        <ConfirmDialog
          title="Make new calendar links?"
          confirmLabel="Make new links"
          destructive
          isConfirming={reset.isPending}
          onConfirm={() => reset.mutate(undefined, { onSettled: () => setConfirmReset(false) })}
          onCancel={() => setConfirmReset(false)}
        >
          <p>Calendars added with the old links stop updating. Do this if a link was shared by mistake or someone left.</p>
        </ConfirmDialog>
      )}
    </FormPage>
  );
}
