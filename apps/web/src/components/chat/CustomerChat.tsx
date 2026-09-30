import { useEffect, useRef, useState } from "react";
import { usePublicThread, useSendPublicMessage } from "../../lib/bookingChat";
import { isDemoSlug } from "../../lib/demo";
import { ChatThread } from "./ChatThread";

const QUICK_REPLIES = ["I'll be 10 minutes late", "Can I bring a reference photo?", "Please confirm my booking", "Is there parking nearby?"];

/** The customer's side of a booking chat, loaded from their private booking token. */
export function CustomerChat({ token, className }: { token: string; className?: string }) {
  const { data, refetch } = usePublicThread(token);
  const send = useSendPublicMessage(token);
  const [awaitingReply, setAwaitingReply] = useState(false);
  const businessCount = useRef(0);

  const messages = data?.messages ?? [];
  const fromBusiness = messages.filter((message) => message.from === "business").length;

  useEffect(() => {
    if (fromBusiness > businessCount.current) setAwaitingReply(false);
    businessCount.current = fromBusiness;
  }, [fromBusiness]);

  if (!data) {
    return <div className={`skeleton-shimmer rounded-2xl bg-stone-100 ${className ?? "h-[380px]"}`} />;
  }

  const demo = isDemoSlug(data.business.slug);
  const closed = data.booking.status === "CANCELLED";

  async function handleSend(body: string) {
    await send.mutateAsync(body);
    if (demo) {
      // The demo salon answers a couple of seconds later; show it typing and fetch the reply promptly.
      setAwaitingReply(true);
      setTimeout(() => void refetch(), 2600);
      setTimeout(() => setAwaitingReply(false), 9000);
    }
  }

  return (
    <ChatThread
      messages={messages}
      me="customer"
      onSend={handleSend}
      timezone={data.business.timezone}
      quickReplies={messages.some((message) => message.from === "customer") ? [] : QUICK_REPLIES}
      showTyping={awaitingReply}
      placeholder={`Message ${data.business.name}…`}
      disabled={closed}
      disabledText="This booking was cancelled. Book again any time."
      className={className}
    />
  );
}
