import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronUp, EyeOff, Loader2 } from "lucide-react";
import type { IdeaKind, IdeaProfile, IdeaStatus } from "@servicebook/types";
import { MarketingLayout } from "../../components/marketing/MarketingLayout";
import { useRoadmap, useSuggestIdea, useUpdateIdea, useVote } from "../../lib/roadmap";
import { ApiError } from "../../lib/apiClient";

const SECTIONS: { status: Exclude<IdeaStatus, "shipped">; title: string; note: string }[] = [
  { status: "in_progress", title: "Being built now", note: "Coming in the next few weeks." },
  { status: "planned", title: "Planned", note: "Decided, not started yet. Votes decide the order." },
  { status: "idea", title: "Ideas", note: "Suggestions from business owners. The most-wanted get planned." },
];

const STATUS_LABEL: Record<IdeaStatus, string> = { idea: "Idea", planned: "Planned", in_progress: "Building", shipped: "Shipped" };

function VoteButton({ idea, voted }: { idea: IdeaProfile; voted: boolean }) {
  const vote = useVote();
  return (
    <button
      type="button"
      onClick={() => vote.mutate(idea.id)}
      disabled={vote.isPending}
      aria-pressed={voted}
      aria-label={voted ? `Remove your vote for ${idea.title}` : `Vote for ${idea.title}`}
      className={`flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-xl border text-sm font-semibold tabular-nums transition-colors ${
        voted ? "border-stone-900 bg-stone-900 text-white dark:border-brand-600 dark:bg-brand-600" : "border-stone-200 bg-surface text-stone-700 hover:border-stone-400"
      }`}
    >
      <ChevronUp className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
      {idea.votes}
    </button>
  );
}

function AdminControls({ idea }: { idea: IdeaProfile }) {
  const update = useUpdateIdea();
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select
        value={idea.status}
        onChange={(event) => update.mutate({ id: idea.id, status: event.target.value as IdeaStatus })}
        className="rounded-lg border border-stone-300 bg-surface px-2 py-1 text-xs text-stone-700"
        aria-label="Status"
      >
        {(Object.keys(STATUS_LABEL) as IdeaStatus[]).map((status) => (
          <option key={status} value={status}>
            {STATUS_LABEL[status]}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => update.mutate({ id: idea.id, hidden: !idea.hidden })}
        className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-2 py-1 text-xs text-stone-600 hover:bg-stone-50"
      >
        <EyeOff className="h-3 w-3" aria-hidden="true" /> {idea.hidden ? "Show" : "Hide"}
      </button>
    </div>
  );
}

function IdeaRow({ idea, voted, isAdmin }: { idea: IdeaProfile; voted: boolean; isAdmin: boolean }) {
  return (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: idea.hidden ? 0.45 : 1 }} className="flex gap-4 py-4">
      <VoteButton idea={idea} voted={voted} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-stone-900">{idea.title}</p>
        {idea.description && <p className="mt-1 text-[15px] leading-relaxed text-stone-600">{idea.description}</p>}
        <p className="mt-1.5 text-xs text-stone-400">
          {idea.kind === "design" ? "Design" : "Feature"}
          {idea.authorName && ` · Suggested by ${idea.authorName}`}
        </p>
        {isAdmin && <AdminControls idea={idea} />}
      </div>
    </motion.li>
  );
}

function SuggestForm({ canSuggest }: { canSuggest: boolean }) {
  const suggest = useSuggestIdea();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<IdeaKind>("feature");
  const [sent, setSent] = useState(false);

  if (!canSuggest) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-surface p-5">
        <p className="font-semibold text-stone-900">Suggest something</p>
        <p className="mt-1 text-sm text-stone-600">Business owners can suggest features and design changes. Anyone can vote.</p>
        <div className="mt-4 flex gap-3 text-sm font-semibold">
          <Link to="/login" state={{ from: "/roadmap" }} className="text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900">
            Log in
          </Link>
          <Link to="/register" className="text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900">
            Create an account
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSent(false);
    try {
      await suggest.mutateAsync({ title: title.trim(), description: description.trim() || undefined, kind });
      setTitle("");
      setDescription("");
      setSent(true);
    } catch {
      // The error message is shown below the form.
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-200 bg-surface p-5">
      <p className="font-semibold text-stone-900">Suggest something</p>
      <p className="mt-1 text-sm text-stone-600">A feature you need, or something about the design that gets in your way.</p>
      <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 text-sm font-medium">
        {(["feature", "design"] as IdeaKind[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setKind(option)}
            className={`rounded-lg py-1.5 transition-colors ${kind === option ? "bg-surface text-stone-900 shadow-sm" : "text-stone-500"}`}
          >
            {option === "feature" ? "Feature" : "Design"}
          </button>
        ))}
      </div>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={90}
        placeholder={kind === "feature" ? "e.g. Deposits for long appointments" : "e.g. Bigger buttons on the calendar"}
        className="mt-3 w-full rounded-xl border border-stone-300 bg-surface px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none"
        aria-label="Title"
      />
      <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        maxLength={600}
        rows={3}
        placeholder="What would it help you do? (optional)"
        className="mt-2 w-full resize-none rounded-xl border border-stone-300 bg-surface px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none"
        aria-label="Details"
      />
      {suggest.isError && (
        <p className="mt-2 text-sm text-red-600">{suggest.error instanceof ApiError ? suggest.error.message : "Couldn't send. Please try again."}</p>
      )}
      {sent && <p className="mt-2 text-sm text-emerald-700">Thanks! It's on the board under Ideas.</p>}
      <button
        type="submit"
        disabled={title.trim().length < 4 || suggest.isPending}
        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-ink text-sm font-semibold text-white transition disabled:opacity-50 dark:bg-highlight dark:text-ink"
      >
        {suggest.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Add to the board
      </button>
    </form>
  );
}

export function RoadmapPage() {
  const { data, isPending, isError } = useRoadmap();
  const [kindFilter, setKindFilter] = useState<"all" | IdeaKind>("all");
  const items = (data?.items ?? []).filter((item) => kindFilter === "all" || item.kind === kindFilter);
  const voted = new Set(data?.myVotes ?? []);
  const shipped = items.filter((item) => item.status === "shipped").sort((a, b) => (b.shippedAt ?? "").localeCompare(a.shippedAt ?? ""));

  return (
    <MarketingLayout>
      <section className="bg-ink">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-12 sm:px-6 sm:pb-14 sm:pt-16 lg:px-8">
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">Roadmap</h1>
          <p className="mt-4 max-w-xl text-base text-white/65 sm:text-lg">
            What&apos;s being built, what&apos;s next, and what shipped lately. Vote for what you need; business owners can suggest ideas.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14 lg:px-8 lg:py-14">
        <div>
          <div className="flex gap-1.5">
            {(["all", "feature", "design"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setKindFilter(option)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  kindFilter === option ? "bg-stone-900 text-white dark:bg-stone-200 dark:text-stone-900" : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {option === "all" ? "Everything" : option === "feature" ? "Features" : "Design"}
              </button>
            ))}
          </div>

          {isPending && (
            <div className="mt-8 space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton-shimmer h-20 rounded-2xl bg-stone-200/70" />
              ))}
            </div>
          )}
          {isError && <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Couldn&apos;t load the roadmap. Please refresh.</p>}

          {data &&
            SECTIONS.map((section) => {
              const sectionItems = items.filter((item) => item.status === section.status);
              if (sectionItems.length === 0) return null;
              return (
                <section key={section.status} className="mt-10 first-of-type:mt-8">
                  <div className="flex items-baseline justify-between gap-4 border-b border-stone-200 pb-3">
                    <h2 className="text-xl font-semibold text-stone-900">{section.title}</h2>
                    <p className="text-sm text-stone-500">{section.note}</p>
                  </div>
                  <ul className="divide-y divide-stone-100">
                    <AnimatePresence initial={false}>
                      {sectionItems.map((idea) => (
                        <IdeaRow key={idea.id} idea={idea} voted={voted.has(idea.id)} isAdmin={Boolean(data.isAdmin)} />
                      ))}
                    </AnimatePresence>
                  </ul>
                </section>
              );
            })}
        </div>

        <aside className="order-first space-y-6 lg:order-none">
          <div className="lg:sticky lg:top-24 lg:space-y-6">
            <SuggestForm canSuggest={Boolean(data?.canSuggest)} />
            {shipped.length > 0 && (
              <div className="mt-6 lg:mt-0">
                <h2 className="text-sm font-medium text-stone-500">Recently shipped</h2>
                <ol className="mt-3 space-y-4 border-l border-stone-200 pl-4">
                  {shipped.slice(0, 8).map((item) => (
                    <li key={item.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-brand-600" />
                      <p className="text-xs text-stone-400">
                        {item.shippedAt ? new Date(item.shippedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}
                      </p>
                      <p className="text-sm font-medium text-stone-900">{item.title}</p>
                      {data?.isAdmin && <AdminControls idea={item} />}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </aside>
      </div>
    </MarketingLayout>
  );
}
