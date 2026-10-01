import { useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { motion } from "motion/react";
import { ChevronRight, Clock, MapPin, MessageSquareQuote } from "lucide-react";
import type { PublicStaffDetailResponse, ReviewProfile, ShowcaseStaff, WorkPostProfile } from "@servicebook/types";
import { usePublicShowcase, usePublicStaffDetail } from "../../lib/showcase";
import { describeTimeOff } from "../../lib/timeOff";
import { imageSrc } from "../../lib/images";
import { Avatar } from "../ui/Avatar";
import { RatingBadge, Stars } from "./Stars";
import { Sheet } from "./Sheet";

export interface BookIntent {
  staffId: string;
  serviceId?: string;
}

const firstName = (name: string) => name.split(" ")[0];

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function clock(time?: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${suffix}`;
}

/** "Mon–Sat 9 AM – 7 PM", "Sun Off": runs of days with the same hours, Monday first. */
function weekSummary(hours: PublicStaffDetailResponse["hours"]): Array<{ days: string; time: string; off: boolean }> {
  const order = [1, 2, 3, 4, 5, 6, 0].map((day) => hours.find((entry) => entry.dayOfWeek === day) ?? { dayOfWeek: day, isOff: true });
  const rows: Array<{ from: number; to: number; key: string; off: boolean; time: string }> = [];
  for (const entry of order) {
    const time = entry.isOff ? "Off" : `${clock(entry.startTime)} – ${clock(entry.endTime)}`;
    const last = rows.at(-1);
    if (last && last.key === time) last.to = entry.dayOfWeek;
    else rows.push({ from: entry.dayOfWeek, to: entry.dayOfWeek, key: time, off: entry.isOff, time });
  }
  return rows.map((row) => ({
    days: row.from === row.to ? DAY_SHORT[row.from] : `${DAY_SHORT[row.from]}–${DAY_SHORT[row.to]}`,
    time: row.time,
    off: row.off,
  }));
}

function SectionTitle({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-4 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <h2 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">{title}</h2>
      {note && <span className="text-sm text-stone-500">{note}</span>}
    </div>
  );
}

export function ReviewCard({ review, showStaff = true }: { review: ReviewProfile; showStaff?: boolean }) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-stone-900">{review.customerName}</p>
        <span className="text-xs text-stone-400">{formatDistanceToNowStrict(new Date(review.createdAt), { addSuffix: true })}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Stars value={review.rating} />
        <span className="text-xs text-stone-500">
          {review.serviceName}
          {showStaff && review.staffName ? ` with ${firstName(review.staffName)}` : ""}
        </span>
      </div>
      {review.comment && <p className="mt-2.5 text-[15px] leading-relaxed text-stone-700">{review.comment}</p>}
      {review.reply && (
        <p className="mt-3 rounded-xl bg-stone-100 px-3 py-2 text-sm text-stone-600">
          <span className="font-semibold text-stone-800">Reply: </span>
          {review.reply}
        </p>
      )}
    </article>
  );
}

function PostTile({ post, onOpen, index }: { post: WorkPostProfile; onOpen: () => void; index: number }) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: (index % 4) * 0.05 }}
      className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-stone-200 text-left"
    >
      <img src={imageSrc(post.imageUrl)} alt={post.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3 pt-10">
        <span className="block truncate text-sm font-semibold text-white">{post.title}</span>
        <span className="block truncate text-xs text-white/75">by {firstName(post.staff.name)}</span>
      </span>
    </motion.button>
  );
}

function PostSheet({ post, onClose, onBook, onOpenStaff }: { post: WorkPostProfile | null; onClose: () => void; onBook: (intent: BookIntent) => void; onOpenStaff: (id: string) => void }) {
  return (
    <Sheet open={Boolean(post)} onClose={onClose} label={post?.title ?? "Style"}>
      {post && (
        <>
          <img src={imageSrc(post.imageUrl)} alt={post.title} className="max-h-[60svh] w-full bg-stone-900 object-contain" />
          <div className="space-y-4 p-5">
            <div>
              <h3 className="text-xl font-bold text-stone-900">{post.title}</h3>
              {post.service && <p className="mt-0.5 text-sm text-stone-500">{post.service.name}</p>}
              {post.caption && <p className="mt-3 text-[15px] leading-relaxed text-stone-700">{post.caption}</p>}
            </div>
            <button
              type="button"
              onClick={() => onOpenStaff(post.staff.id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 p-3 text-left transition-colors hover:bg-stone-50"
            >
              <Avatar name={post.staff.name} src={post.staff.avatarUrl} size="sm" />
              <span className="flex-1 text-sm">
                <span className="block text-stone-500">Done by</span>
                <span className="block font-semibold text-stone-900">{post.staff.name}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-stone-400" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onBook({ staffId: post.staff.id, serviceId: post.service?.id })}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-ink text-[15px] font-semibold text-white transition hover:bg-ink-700 dark:bg-highlight dark:text-ink"
            >
              Book this style with {firstName(post.staff.name)}
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}

function StaffSheet({
  slug,
  staffId,
  fallback,
  onClose,
  onBook,
  onOpenPost,
}: {
  slug: string;
  staffId: string | null;
  fallback?: ShowcaseStaff;
  onClose: () => void;
  onBook: (intent: BookIntent) => void;
  onOpenPost: (post: WorkPostProfile) => void;
}) {
  const { data, isPending } = usePublicStaffDetail(slug, staffId);
  const member = data?.staff ?? fallback;
  return (
    <Sheet open={Boolean(staffId)} onClose={onClose} label={member?.name ?? "Staff profile"}>
      {member && (
        <div>
          <div className="bg-ink px-5 pb-5 pt-8 text-white">
            <div className="flex items-center gap-4">
              <Avatar name={member.name} src={member.avatarUrl} size="lg" className="ring-4 ring-white/10" />
              <div className="min-w-0">
                <h3 className="truncate text-xl font-bold">{member.name}</h3>
                {member.title && <p className="text-sm text-white/65">{member.title}</p>}
                {member.rating && member.reviewCount ? (
                  <p className="mt-1.5 flex items-center gap-2 text-sm">
                    <Stars value={member.rating} />
                    <span className="font-semibold">{member.rating.toFixed(1)}</span>
                    <span className="text-white/55">· {member.reviewCount} reviews</span>
                  </p>
                ) : (
                  <p className="mt-1.5 text-sm text-white/55">No reviews yet</p>
                )}
              </div>
            </div>
            {member.bio && <p className="mt-4 text-[15px] leading-relaxed text-white/80">{member.bio}</p>}
          </div>

          <div className="space-y-6 p-5">
            {(member.location || (data && (data.away.length > 0 || data.hours.some((entry) => !entry.isOff)))) && (
              <section className="grid gap-3 sm:grid-cols-2">
                {data && data.hours.some((entry) => !entry.isOff) && (
                  <div className="rounded-2xl border border-stone-200 p-4">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" /> When {firstName(member.name)} works
                    </p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {weekSummary(data.hours).map((row) => (
                        <li key={row.days} className="flex justify-between gap-3">
                          <span className="font-medium text-stone-800">{row.days}</span>
                          <span className={row.off ? "text-stone-400" : "text-stone-600"}>{row.time}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data && data.away.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:col-span-2 dark:border-amber-500/30 dark:bg-amber-500/10">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">Away</p>
                    <ul className="mt-1.5 space-y-0.5 text-sm text-stone-800">
                      {data.away.map((entry) => (
                        <li key={`${entry.startDate}-${entry.startTime ?? ""}`}>{describeTimeOff(entry)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {member.location && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(member.location)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group rounded-2xl border border-stone-200 p-4 transition-colors hover:border-stone-300 hover:bg-stone-50"
                  >
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Where
                    </p>
                    <p className="mt-2 text-sm font-medium text-stone-800">{member.location}</p>
                    <p className="mt-1 text-xs font-semibold text-brand-700 group-hover:underline">Get directions</p>
                  </a>
                )}
              </section>
            )}

            {data && data.serviceRatings.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-400">How customers rate {firstName(member.name)}</h4>
                <ul className="mt-2 divide-y divide-stone-100 rounded-2xl border border-stone-200">
                  {data.serviceRatings.map((row) => (
                    <li key={row.serviceId} className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="min-w-0 truncate text-sm font-medium text-stone-800">{row.serviceName}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Stars value={row.rating} />
                        <span className="w-16 text-right text-xs text-stone-500">
                          {row.rating.toFixed(1)} · {row.count}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data && data.posts.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-400">{firstName(member.name)}&apos;s work</h4>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {data.posts.map((post) => (
                    <button key={post.id} type="button" onClick={() => onOpenPost(post)} className="aspect-square overflow-hidden rounded-xl bg-stone-200">
                      <img src={imageSrc(post.imageUrl)} alt={post.title} loading="lazy" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {data && data.reviews.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-400">Recent reviews</h4>
                <div className="mt-2 space-y-2.5">
                  {data.reviews.slice(0, 6).map((review) => (
                    <ReviewCard key={review.id} review={review} showStaff={false} />
                  ))}
                </div>
              </section>
            )}

            {isPending && <div className="skeleton-shimmer h-32 rounded-2xl bg-stone-200/70" />}
          </div>

          <div className="sticky bottom-0 border-t border-stone-200 bg-surface/95 p-4 backdrop-blur">
            <button
              type="button"
              onClick={() => onBook({ staffId: member.id })}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-ink text-[15px] font-semibold text-white transition hover:bg-ink-700 dark:bg-highlight dark:text-ink"
            >
              Book with {firstName(member.name)}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/** Team, portfolio and reviews under the booking card. Renders nothing for a business with none of them. */
export function PublicShowcase({ slug, onBook }: { slug: string; onBook: (intent: BookIntent, member?: ShowcaseStaff) => void }) {
  const { data } = usePublicShowcase(slug);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [post, setPost] = useState<WorkPostProfile | null>(null);
  const [allReviews, setAllReviews] = useState(false);
  if (!data) return null;

  const { posts, staff, reviews, summary } = data;
  const showTeam = staff.length > 1 || staff.some((member) => member.bio || member.reviewCount);
  const book = (intent: BookIntent) => {
    setPost(null);
    setStaffId(null);
    onBook(intent, staff.find((member) => member.id === intent.staffId));
  };
  const openStaff = (id: string) => {
    setPost(null);
    setStaffId(id);
  };

  return (
    <div className="mt-12 space-y-12">
      {showTeam && (
        <section aria-labelledby="team-heading">
          <div id="team-heading">
            <SectionTitle title="Meet the team" note="Tap someone to see their work" />
          </div>
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {staff.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setStaffId(member.id)}
                className="w-60 shrink-0 snap-start rounded-2xl border border-stone-200 bg-surface p-4 text-left transition hover:border-stone-300 hover:shadow-[0_10px_30px_-18px_rgb(12_26_20/0.4)] sm:w-auto"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={member.name} src={member.avatarUrl} size="md" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-stone-900">{member.name}</p>
                    {member.title && <p className="truncate text-xs text-stone-500">{member.title}</p>}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  {member.reviewCount ? <RatingBadge rating={member.rating} count={member.reviewCount} /> : <span className="text-xs text-stone-400">New</span>}
                  <span className="truncate text-xs text-stone-400">{member.services.slice(0, 2).join(", ")}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section>
          <SectionTitle title="Our work" note={`${posts.length} style${posts.length === 1 ? "" : "s"}`} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {posts.map((entry, index) => (
              <PostTile key={entry.id} post={entry} index={index} onOpen={() => setPost(entry)} />
            ))}
          </div>
        </section>
      )}

      {reviews.length > 0 && (
        <section id="reviews" className="scroll-mt-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">What customers say</h2>
            <div className="flex items-center gap-3">
              <span className="font-display text-4xl font-semibold text-stone-900">{summary.rating.toFixed(1)}</span>
              <span>
                <Stars value={summary.rating} className="h-4 w-4" />
                <span className="block text-xs text-stone-500">{summary.count} verified reviews</span>
              </span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(allReviews ? reviews : reviews.slice(0, 4)).map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-xs text-stone-500">
              <MessageSquareQuote className="h-3.5 w-3.5" aria-hidden="true" /> Only customers who had the appointment can leave a review.
            </p>
            {reviews.length > 4 && (
              <button type="button" onClick={() => setAllReviews((value) => !value)} className="text-sm font-semibold text-stone-900 underline decoration-stone-300 underline-offset-4">
                {allReviews ? "Show fewer" : `Show all ${reviews.length}`}
              </button>
            )}
          </div>
        </section>
      )}

      <StaffSheet
        slug={slug}
        staffId={staffId}
        fallback={staff.find((member) => member.id === staffId)}
        onClose={() => setStaffId(null)}
        onBook={book}
        onOpenPost={(entry) => {
          setStaffId(null);
          setPost(entry);
        }}
      />
      <PostSheet post={post} onClose={() => setPost(null)} onBook={book} onOpenStaff={openStaff} />
    </div>
  );
}
