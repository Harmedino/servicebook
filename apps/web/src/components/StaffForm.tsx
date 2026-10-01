import { useState, type FormEvent } from "react";
import type { ServiceProfile, StaffProfile } from "@servicebook/types";
import { FormField } from "./FormField";
import { ImageUpload } from "./ImageUpload";
import { Button } from "./ui/Button";

export interface StaffFormSubmitValues {
  name: string;
  email?: string;
  phone?: string;
  /** "" removes an existing photo. */
  avatarUrl?: string;
  /** "" clears it when editing. */
  title?: string;
  bio?: string;
  serviceIds: string[];
  isActive: boolean;
}

interface StaffFormProps {
  /** null = adding a new staff member, a StaffProfile = editing an existing one */
  staff: StaffProfile | null;
  /** Active services plus any inactive ones this staff member is already assigned to, so an existing assignment is never silently dropped on save. */
  availableServices: ServiceProfile[];
  isSubmitting: boolean;
  serverError: string | null;
  onSubmit: (values: StaffFormSubmitValues) => void;
  onCancel: () => void;
}

interface FieldErrors {
  name?: string;
  email?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function StaffForm({
  staff,
  availableServices,
  isSubmitting,
  serverError,
  onSubmit,
  onCancel,
}: StaffFormProps) {
  const [name, setName] = useState(staff?.name ?? "");
  const [email, setEmail] = useState(staff?.email ?? "");
  const [phone, setPhone] = useState(staff?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(staff?.avatarUrl ?? "");
  const [title, setTitle] = useState(staff?.title ?? "");
  const [bio, setBio] = useState(staff?.bio ?? "");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(staff?.serviceIds ?? []);
  const [isActive, setIsActive] = useState(staff?.isActive ?? true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function toggleService(id: string) {
    setSelectedServiceIds((current) =>
      current.includes(id) ? current.filter((serviceId) => serviceId !== id) : [...current, id],
    );
  }

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!name.trim()) {
      errors.name = "Staff name is required";
    }
    if (email.trim() && !EMAIL_PATTERN.test(email)) {
      errors.email = "Enter a valid email address";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    onSubmit({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      avatarUrl: staff ? avatarUrl : avatarUrl || undefined,
      title: staff ? title.trim() : title.trim() || undefined,
      bio: staff ? bio.trim() : bio.trim() || undefined,
      serviceIds: selectedServiceIds,
      isActive,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <ImageUpload
        label="Photo"
        hint="Optional. Customers see it when choosing who to book with."
        value={avatarUrl}
        onChange={setAvatarUrl}
        shape="circle"
        maxSize={512}
        disabled={isSubmitting}
      />
      <FormField
        label="Name"
        type="text"
        value={name}
        onChange={setName}
        error={fieldErrors.name}
        disabled={isSubmitting}
      />
      <FormField
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        error={fieldErrors.email}
        disabled={isSubmitting}
      />
      <FormField label="Phone" type="tel" value={phone} onChange={setPhone} disabled={isSubmitting} />
      <FormField label="Title (shown to customers)" type="text" value={title} onChange={setTitle} disabled={isSubmitting} />
      <label className="block">
        <span className="text-sm font-medium text-stone-700">
          Short bio <span className="font-normal text-stone-400">· what they're best at</span>
        </span>
        <textarea
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          rows={3}
          maxLength={400}
          disabled={isSubmitting}
          placeholder="e.g. Nine years on the clippers. Clean fades and sharp line-ups."
          className="mt-1 w-full resize-none rounded-lg border border-stone-300 bg-surface px-3 py-2.5 text-base text-stone-900 sm:py-2 sm:text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </label>

      <div>
        <span className="text-sm font-medium text-stone-700">Services</span>
        {availableServices.length === 0 ? (
          <p className="mt-1 text-sm text-stone-500">Add a service first so you can assign it to staff.</p>
        ) : (
          <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-lg border border-stone-200 p-3">
            {availableServices.map((service) => (
              <label key={service.id} className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={selectedServiceIds.includes(service.id)}
                  onChange={() => toggleService(service.id)}
                  disabled={isSubmitting}
                  className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500/40"
                />
                {service.name}
                {!service.isActive && <span className="text-xs text-stone-400">(inactive)</span>}
              </label>
            ))}
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          disabled={isSubmitting}
          className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500/40"
        />
        Active
      </label>

      {serverError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {isSubmitting ? "Saving…" : staff ? "Save changes" : "Add staff"}
        </Button>
      </div>
    </form>
  );
}
