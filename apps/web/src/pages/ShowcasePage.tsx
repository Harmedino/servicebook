import { useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import { motion } from "motion/react";
import { Camera, Eye, EyeOff, ExternalLink, ImagePlus, MessageSquareReply, Pencil, Star, Trash2 } from "lucide-react";
import type { ReviewProfile, WorkPostProfile } from "@servicebook/types";
import { DashboardLayout } from "../components/DashboardLayout";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { CardListSkeleton } from "../components/ui/Skeleton";
import { Avatar } from "../components/ui/Avatar";
import { Button, buttonClassName } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { FormField } from "../components/FormField";
import { ImageUpload } from "../components/ImageUpload";
import { Stars } from "../components/showcase/Stars";
import { useStaffList } from "../lib/staff";
import { useServices } from "../lib/services";
import { useMyBusiness } from "../lib/business";
import { useDeleteWorkPost, useReviews, useSaveWorkPost, useUpdateReview, useWorkPosts, type WorkPostInput } from "../lib/showcase";
import { useEscapeToClose } from "../lib/useEscapeToClose";
import { useNewParam } from "../lib/useNewParam";
import { imageSrc } from "../lib/images";
import { ApiError } from "../lib/apiClient";

const selectClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-surface px-3 py-2.5 text-base text-stone-900 sm:py-2 sm:text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40";

function PostFormModal({ post, onClose }: { post: WorkPostProfile | null; onClose: () => void }) {
  useEscapeToClose(onClose);
  const { data: staffData } = useStaffList();
  const { data: serviceData } = useServices();
  const save = useSaveWorkPost();
  const staff = (staffData?.staff ?? []).filter((member) => member.isActive || member.id === post?.staff.id);
  const [imageUrl, setImageUrl] = useState(post?.imageUrl ?? "");
  const [title, setTitle] = useState(post?.title ?? "");
  const [caption, setCaption] = useState(post?.caption ?? "");
  const [staffId, setStaffId] = useState(post?.staff.id ?? (staff.length === 1 ? staff[0].id : ""));
  const [serviceId, setServiceId] = useState(post?.service?.id ?? "");
  const [featured, setFeatured] = useState(post?.featured ?? false);
  const [error, setError] = useState<string | null>(null);

  const member = staff.find((entry) => entry.id === staffId);
  const services = (serviceData?.services ?? []).filter((service) => service.isActive && (!member || member.serviceIds.includes(service.id)));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!imageUrl) return setError("Add a photo of the finished look");
    if (title.trim().length < 2) return setError("Give the style a name, like \"Low taper fade\"");
    if (!staffId) return setError("Who did it?");
    setError(null);
    const input: WorkPostInput = { imageUrl, title: title.trim(), caption: caption.trim() || undefined, staffId, serviceId: serviceId || undefined, featured };
    save.mutate(
      { id: post?.id, ...input },
      { onSuccess: onClose, onError: (err) => setError(err instanceof ApiError ? err.message : "Couldn't save. Please try again.") },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-8">
      <div className="animate-fade-in-up w-full max-w-md rounded-xl border border-stone-200 bg-surface p-6 shadow-[var(--shadow-elevated)]">
        <h2 className="text-lg font-semibold text-stone-900">{post ? "Edit style" : "Add a style"}</h2>
        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          <ImageUpload label="Photo" hint="The finished look. Good light, face the camera." value={imageUrl} onChange={setImageUrl} shape="card" maxSize={1600} disabled={save.isPending} />
          <FormField label="Style name" type="text" value={title} onChange={setTitle} disabled={save.isPending} />
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Done by</span>
            <select value={staffId} onChange={(e) => { setStaffId(e.target.value); setServiceId(""); }} className={selectClass}>
              <option value="">Choose a staff member</option>
              {staff.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Service <span className="font-normal text-stone-400">· lets customers book this style</span></span>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={selectClass}>
              <option value="">None</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Caption <span className="font-normal text-stone-400">· optional</span></span>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} maxLength={300} placeholder="Products used, how long it lasts, who it suits…" className={`${selectClass} resize-none`} />
          </label>
          <label className="flex items-center gap-2.5 text-sm text-stone-700">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-4 w-4 rounded border-stone-300 accent-brand-600" />
            Pin to the front of the gallery
          </label>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={save.isPending}>{post ? "Save" : "Add to showcase"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Portfolio({ onAdd, onEdit }: { onAdd: () => void; onEdit: (post: WorkPostProfile) => void }) {
  const { data, isPending } = useWorkPosts();
  const remove = useDeleteWorkPost();
  const save = useSaveWorkPost();
  const [staffFilter, setStaffFilter] = useState("all");
  const [deleting, setDeleting] = useState<WorkPostProfile | null>(null);
  const posts = data?.posts ?? [];
  const people = useMemo(() => [...new Map(posts.map((post) => [post.staff.id, post.staff])).values()], [posts]);
  const shown = staffFilter === "all" ? posts : posts.filter((post) => post.staff.id === staffFilter);

  if (isPending) return <div className="mt-6"><CardListSkeleton /></div>;
  if (posts.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          icon={Camera}
          title="Show customers what your team can do"
          description="Post photos of finished cuts, braids, nails and looks. Each one is tagged with who did it, shows on your booking page, and has a button to book that style."
          action={<Button onClick={onAdd}><ImagePlus className="h-4 w-4" aria-hidden="true" /> Add your first style</Button>}
        />
      </div>
    );
  }

  return (
    <div className="mt-5">
      {people.length > 1 && (
        <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
          {[{ id: "all", name: "Everyone", avatarUrl: undefined }, ...people].map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => setStaffFilter(person.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium ${
                staffFilter === person.id ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 text-stone-600 hover:border-stone-300"
              }`}
            >
              {person.name.split(" ")[0]}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {shown.map((post) => (
          <motion.div key={post.id} layout className="group overflow-hidden rounded-2xl border border-stone-200 bg-surface">
            <div className="relative aspect-[4/5] bg-stone-200">
              <img src={imageSrc(post.imageUrl)} alt={post.title} loading="lazy" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => save.mutate({ id: post.id, featured: !post.featured })}
                aria-label={post.featured ? "Unpin" : "Pin to front"}
                title={post.featured ? "Pinned to the front" : "Pin to the front"}
                className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur ${post.featured ? "bg-amber-400 text-white" : "bg-black/40 text-white/80 hover:bg-black/60"}`}
              >
                <Star className={`h-4 w-4 ${post.featured ? "fill-white" : ""}`} aria-hidden="true" />
              </button>
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-semibold text-stone-900">{post.title}</p>
              <p className="truncate text-xs text-stone-500">
                {post.staff.name.split(" ")[0]}
                {post.service ? ` · ${post.service.name}` : ""}
              </p>
              <div className="mt-2 flex gap-1">
                <button type="button" onClick={() => onEdit(post)} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-stone-600 hover:bg-stone-100">
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                </button>
                <button type="button" onClick={() => setDeleting(post)} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-red-600 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      {deleting && (
        <ConfirmDialog
          title="Delete this style?"
          confirmLabel="Delete"
          destructive
          isConfirming={remove.isPending}
          onConfirm={() => remove.mutate(deleting.id, { onSettled: () => setDeleting(null) })}
          onCancel={() => setDeleting(null)}
        >
          <p>&ldquo;{deleting.title}&rdquo; will be removed from your booking page.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

function OwnerReviewCard({ review }: { review: ReviewProfile }) {
  const update = useUpdateReview();
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState(review.reply ?? "");

  return (
    <li className={`rounded-2xl border border-stone-200 bg-surface p-4 ${review.hidden ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Stars value={review.rating} />
          <span className="text-sm font-semibold text-stone-900">{review.customerName}</span>
          {review.hidden && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">Hidden</span>}
        </div>
        <span className="text-xs text-stone-400">{formatDistanceToNowStrict(new Date(review.createdAt), { addSuffix: true })}</span>
      </div>
      <p className="mt-1 text-xs text-stone-500">
        {review.serviceName} with {review.staffName}
      </p>
      {review.comment && <p className="mt-2 text-[15px] leading-relaxed text-stone-700">{review.comment}</p>}
      {review.reply && !replying && (
        <p className="mt-3 rounded-xl bg-stone-100 px-3 py-2 text-sm text-stone-600">
          <span className="font-semibold text-stone-800">Your reply: </span>
          {review.reply}
        </p>
      )}
      {replying && (
        <form
          className="mt-3 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            update.mutate({ id: review.id, reply: reply.trim() }, { onSuccess: () => setReplying(false) });
          }}
        >
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} maxLength={600} autoFocus placeholder="Thank them, or say what you'll do about it. Shown publicly." className={`${selectClass} resize-none`} />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setReplying(false)}>Cancel</Button>
            <Button type="submit" size="sm" isLoading={update.isPending}>Post reply</Button>
          </div>
        </form>
      )}
      {!replying && (
        <div className="mt-3 flex gap-1">
          <button type="button" onClick={() => setReplying(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-stone-600 hover:bg-stone-100">
            <MessageSquareReply className="h-3.5 w-3.5" aria-hidden="true" /> {review.reply ? "Edit reply" : "Reply"}
          </button>
          <button
            type="button"
            onClick={() => update.mutate({ id: review.id, hidden: !review.hidden })}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-stone-600 hover:bg-stone-100"
          >
            {review.hidden ? <Eye className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}
            {review.hidden ? "Show on booking page" : "Hide"}
          </button>
        </div>
      )}
    </li>
  );
}

function Reviews() {
  const { data, isPending } = useReviews();
  const { data: staffData } = useStaffList();
  const [filter, setFilter] = useState<"all" | "low" | "unreplied">("all");
  if (isPending) return <div className="mt-6"><CardListSkeleton /></div>;
  const reviews = data?.reviews ?? [];
  if (reviews.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description="When you mark an appointment as completed, the customer gets a message in their booking chat asking them to rate it. Only people who actually came can leave one."
        />
      </div>
    );
  }
  const ranked = [...(staffData?.staff ?? [])].filter((member) => member.reviewCount).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const shown = reviews.filter((review) => (filter === "low" ? review.rating <= 3 : filter === "unreplied" ? !review.reply : true));

  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-2xl border border-stone-200 bg-surface p-5">
          <p className="text-sm text-stone-500">Overall</p>
          <p className="mt-1 flex items-center gap-3">
            <span className="font-display text-4xl font-semibold text-stone-900">{data?.summary.rating.toFixed(1)}</span>
            <span>
              <Stars value={data?.summary.rating ?? 0} className="h-4 w-4" />
              <span className="block text-xs text-stone-500">{data?.summary.count} public reviews</span>
            </span>
          </p>
        </div>
        {ranked.length > 0 && (
          <div className="rounded-2xl border border-stone-200 bg-surface p-5">
            <p className="text-sm font-semibold text-stone-900">By staff</p>
            <ul className="mt-3 space-y-3">
              {ranked.map((member) => (
                <li key={member.id} className="flex items-center gap-3">
                  <Avatar name={member.name} src={member.avatarUrl} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-stone-800">{member.name}</span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-stone-100">
                      <span className="block h-full rounded-full bg-amber-400" style={{ width: `${((member.rating ?? 0) / 5) * 100}%` }} />
                    </span>
                  </span>
                  <span className="text-right text-sm font-semibold text-stone-900">
                    {member.rating?.toFixed(1)}
                    <span className="block text-[11px] font-normal text-stone-400">{member.reviewCount}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
      <div>
        <div className="mb-3 flex gap-2">
          {([["all", "All"], ["low", "3 stars or less"], ["unreplied", "No reply"]] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${filter === key ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 text-stone-600"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">Nothing here.</p>
        ) : (
          <ul className="space-y-3">
            {shown.map((review) => (
              <OwnerReviewCard key={review.id} review={review} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function ShowcasePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "reviews" ? "reviews" : "portfolio";
  const { data: businessData } = useMyBusiness();
  const { data: postData } = useWorkPosts();
  const { data: reviewData } = useReviews();
  const [editing, setEditing] = useState<WorkPostProfile | null | "new">(null);
  useNewParam(() => setEditing("new"));
  const slug = businessData?.business?.slug;

  const tabs = [
    { key: "portfolio", label: "Our work", count: postData?.posts.length },
    { key: "reviews", label: "Reviews", count: reviewData?.reviews.length },
  ] as const;

  return (
    <DashboardLayout>
      <PageHeader
        title="Showcase"
        description="Your team's work and what customers say about it. Both appear on your booking page."
        actions={
          <>
            {slug && (
              <Link to={`/book/${slug}#reviews`} target="_blank" className={buttonClassName("secondary", "md")}>
                <ExternalLink className="h-4 w-4" aria-hidden="true" /> View as customer
              </Link>
            )}
            <Button onClick={() => setEditing("new")}>
              <ImagePlus className="h-4 w-4" aria-hidden="true" /> Add a style
            </Button>
          </>
        }
      />
      <div className="mt-5 flex gap-5 border-b border-stone-200">
        {tabs.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setSearchParams({ tab: entry.key }, { replace: true })}
            className={`-mb-px flex items-center gap-2 border-b-2 pb-2.5 text-sm font-medium transition-colors ${
              tab === entry.key ? "border-stone-900 text-stone-900" : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {entry.label}
            {entry.count ? <span className="rounded-full bg-stone-100 px-1.5 text-[11px] tabular-nums text-stone-600">{entry.count}</span> : null}
          </button>
        ))}
      </div>
      {tab === "portfolio" ? <Portfolio onAdd={() => setEditing("new")} onEdit={setEditing} /> : <Reviews />}
      {editing && <PostFormModal post={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </DashboardLayout>
  );
}
