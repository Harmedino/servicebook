import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { useSubmitReview } from "../../lib/showcase";
import { ApiError } from "../../lib/apiClient";
import { StarInput, Stars } from "./Stars";

interface ReviewFormProps {
  token: string;
  staffName?: string;
  serviceName: string;
  existing?: { rating: number; comment?: string };
}

/** Shown on /my-booking/:token once the appointment is marked done. */
export function ReviewForm({ token, staffName, serviceName, existing }: ReviewFormProps) {
  const submit = useSubmitReview(token);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const who = staffName ? staffName.split(" ")[0] : "them";

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!rating) {
      setError("Tap a star to rate");
      return;
    }
    setError(null);
    submit.mutate(
      { rating, comment: comment.trim() || undefined },
      { onError: (err) => setError(err instanceof ApiError ? err.message : "Couldn't send your rating. Please try again.") },
    );
  }

  return (
    <section className="mt-4 overflow-hidden rounded-3xl border border-amber-200 bg-amber-50/60 p-5 sm:p-6 dark:border-amber-500/30 dark:bg-amber-500/5">
      <AnimatePresence mode="wait" initial={false}>
        {existing ? (
          <motion.div key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
              <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-stone-900">Thanks for rating your visit</p>
              <div className="mt-1">
                <Stars value={existing.rating} className="h-4 w-4" />
              </div>
              {existing.comment && <p className="mt-2 text-sm text-stone-600">&ldquo;{existing.comment}&rdquo;</p>}
            </div>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={handleSubmit} exit={{ opacity: 0 }} className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">How did {who} do?</h2>
              <p className="text-sm text-stone-600">
                Your rating for {serviceName} helps other customers pick the right person.
              </p>
            </div>
            <StarInput value={rating} onChange={setRating} />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={600}
              placeholder="What did you like? Anything that could be better? (optional)"
              className="w-full resize-none rounded-xl border border-stone-300 bg-surface px-3.5 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-stone-500">Shown with your first name and initial.</p>
              <button
                type="submit"
                disabled={submit.isPending}
                className="inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink-700 disabled:opacity-70 dark:bg-highlight dark:text-ink"
              >
                {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Send rating
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  );
}
