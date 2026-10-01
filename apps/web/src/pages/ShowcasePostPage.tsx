import { useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { WorkPostProfile } from "@servicebook/types";
import { Button } from "../components/ui/Button";
import { FormField } from "../components/FormField";
import { ImageUpload } from "../components/ImageUpload";
import { useStaffList } from "../lib/staff";
import { useServices } from "../lib/services";
import { useSaveWorkPost, useWorkPosts, type WorkPostInput } from "../lib/showcase";
import { ApiError } from "../lib/apiClient";
import { FormPage } from "./FormPages";

const selectClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-surface px-3 py-2.5 text-base text-stone-900 sm:py-2 sm:text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40";

function PostForm({ post, onDone }: { post: WorkPostProfile | null; onDone: () => void }) {
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
      { onSuccess: onDone, onError: (err) => setError(err instanceof ApiError ? err.message : "Couldn't save. Please try again.") },
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
      <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" isLoading={save.isPending}>{post ? "Save" : "Add to showcase"}</Button>
      </div>
    </form>
  );
}

/** /showcase/new and /showcase/:postId/edit */
export function ShowcasePostPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const { data, isPending } = useWorkPosts();
  const post = data?.posts.find((entry) => entry.id === postId) ?? null;
  const done = () => navigate(from ?? "/showcase", { replace: true });

  return (
    <FormPage
      backTo="/showcase"
      backLabel="Showcase"
      title={postId ? "Edit style" : "Add a style"}
      description={postId ? undefined : "A photo of finished work, tagged with who did it. It shows on your booking page with a button to book that style."}
    >
      {postId && isPending ? (
        <div className="skeleton-shimmer h-64 rounded-2xl bg-stone-100" />
      ) : postId && !post ? (
        <p className="text-sm text-stone-500">This style doesn&apos;t exist anymore.</p>
      ) : (
        <PostForm post={post} onDone={done} />
      )}
    </FormPage>
  );
}
