import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Loader2 } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import type { ChatMessage, MessageSender } from "@servicebook/types";

interface ChatThreadProps {
  messages: ChatMessage[];
  /** Which side is reading: their own messages sit on the right. */
  me: MessageSender;
  onSend: (body: string) => Promise<unknown>;
  timezone: string;
  quickReplies?: string[];
  /** Shows the "typing…" bubble, e.g. while the demo salon composes its reply. */
  showTyping?: boolean;
  placeholder?: string;
  disabled?: boolean;
  disabledText?: string;
  className?: string;
}

function dayLabel(iso: string, timezone: string): string {
  const key = formatInTimeZone(new Date(iso), timezone, "yyyy-MM-dd");
  const today = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const yesterday = formatInTimeZone(new Date(Date.now() - 86_400_000), timezone, "yyyy-MM-dd");
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return formatInTimeZone(new Date(iso), timezone, "EEE d MMM");
}

/** A two-sided chat: bubbles grouped by day, quick replies, and a composer that sends on Enter. */
export function ChatThread({
  messages,
  me,
  onSend,
  timezone,
  quickReplies = [],
  showTyping = false,
  placeholder = "Write a message…",
  disabled = false,
  disabledText,
  className = "h-[420px]",
}: ChatThreadProps) {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Stick to the newest message.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending, showTyping]);

  // Grow the composer with its content, up to about five lines.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 132)}px`;
  }, [draft]);

  async function send(text: string) {
    const body = text.trim();
    if (!body || pending) return;
    setError(null);
    setPending(body);
    setDraft("");
    try {
      await onSend(body);
    } catch {
      setDraft(body);
      setError("Couldn't send. Check your connection and try again.");
    } finally {
      setPending(null);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends on a keyboard; phones keep Enter for new lines.
    if (event.key === "Enter" && !event.shiftKey && window.matchMedia("(pointer: fine)").matches) {
      event.preventDefault();
      void send(draft);
    }
  }

  let lastDay = "";

  return (
    <div className={`flex flex-col ${className}`}>
      <div ref={listRef} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-1 py-3">
        {messages.map((message, index) => {
          const day = dayLabel(message.createdAt, timezone);
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = message.from === me;
          const next = messages[index + 1];
          const lastInRun = !next || next.from !== message.from;
          return (
            <div key={message.id}>
              {showDay && <p className="py-2 text-center text-[11px] font-medium text-stone-400">{day}</p>}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
              >
                <p
                  className={`max-w-[82%] whitespace-pre-line break-words px-3.5 py-2 text-[15px] leading-snug ${
                    mine
                      ? `bg-ink text-white dark:bg-brand-700 ${lastInRun ? "rounded-2xl rounded-br-md" : "rounded-2xl"}`
                      : `bg-stone-100 text-stone-900 ${lastInRun ? "rounded-2xl rounded-bl-md" : "rounded-2xl"}`
                  }`}
                >
                  {message.body}
                </p>
                {lastInRun && (
                  <span className="mt-1 px-1 text-[11px] text-stone-400">
                    {formatInTimeZone(new Date(message.createdAt), timezone, "h:mm a")}
                    {message.automated && " · Sent automatically"}
                  </span>
                )}
              </motion.div>
            </div>
          );
        })}

        {pending && (
          <div className="flex justify-end">
            <p className="max-w-[82%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-[15px] text-white opacity-60 dark:bg-brand-700">{pending}</p>
          </div>
        )}

        <AnimatePresence>
          {showTyping && !pending && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex">
              <span className="flex gap-1 rounded-2xl rounded-bl-md bg-stone-100 px-3.5 py-3" aria-label="Typing">
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    className="h-1.5 w-1.5 rounded-full bg-stone-400"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: dot * 0.15 }}
                  />
                ))}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {disabled ? (
        <p className="border-t border-stone-100 px-2 pt-3 text-center text-sm text-stone-500">{disabledText}</p>
      ) : (
        <div className="border-t border-stone-100 pt-3">
          {quickReplies.length > 0 && !draft && (
            <div className="no-scrollbar -mx-1 mb-2.5 flex gap-2 overflow-x-auto px-1">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => void send(reply)}
                  disabled={Boolean(pending)}
                  className="shrink-0 rounded-full border border-stone-200 px-3 py-1.5 text-[13px] text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={1000}
              placeholder={placeholder}
              aria-label="Message"
              className="min-h-[44px] flex-1 resize-none rounded-[22px] border border-stone-300 bg-surface px-4 py-2.5 text-[15px] text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim() || Boolean(pending)}
              aria-label="Send"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-white transition disabled:bg-stone-200 disabled:text-stone-400 dark:bg-highlight dark:text-ink"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowUp className="h-5 w-5" aria-hidden="true" />}
            </button>
          </form>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
