import { Check, Link2 } from "lucide-react";
import { useBookingMessages, useSendBookingMessage } from "../../lib/bookingChat";
import { ChatThread } from "./ChatThread";
import { useCopyLink } from "../CopyLinkDialog";

const QUICK_REPLIES = ["You're confirmed. See you then!", "Yes, that's fine", "Could you come 15 minutes early?", "Sorry, we're fully booked then"];

/** The business's side of one booking's chat. */
export function OwnerThread({ bookingId, timezone, className }: { bookingId: string; timezone: string; className?: string }) {
  const { data, isPending } = useBookingMessages(bookingId);
  const send = useSendBookingMessage(bookingId);
  const { copied, copy: copyText, dialog: copyDialog } = useCopyLink();

  if (isPending || !data) {
    return <div className={`skeleton-shimmer rounded-2xl bg-stone-100 ${className ?? "h-[380px]"}`} />;
  }

  const link = `${window.location.origin}/my-booking/${data.accessToken}`;

  async function copyLink() {
    await copyText(link, "Customer's booking link");
  }

  return (
    <div>
      {copyDialog}
      <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
        <span>{data.messages.length === 0 ? "No messages yet." : "Customers see replies on their booking page."}</span>
        <button type="button" onClick={copyLink} className="inline-flex shrink-0 items-center gap-1 font-medium text-stone-600 hover:text-stone-900">
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Link2 className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied ? "Copied" : "Customer's link"}
        </button>
      </div>
      <ChatThread
        messages={data.messages}
        me="business"
        onSend={(body) => send.mutateAsync(body)}
        timezone={timezone}
        quickReplies={QUICK_REPLIES}
        placeholder="Reply to the customer…"
        className={className}
      />
    </div>
  );
}
