import { useEffect, useState, type FormEvent } from "react";
import type { ServiceProfile, StaffProfile } from "@servicebook/types";
import { FormField } from "./FormField";

export interface StaffFormSubmitValues {
  name: string;
  email?: string;
  phone?: string;
  serviceIds: string[];
  isActive: boolean;
}

interface StaffFormModalProps {
  /** null = adding a new staff member, a StaffProfile = editing an existing one */
  staff: StaffProfile | null;
  /** Active services plus any inactive ones this staff member is already assigned to, so an existing assignment is never silently dropped on save. */
  availableServices: ServiceProfile[];
  isSubmitting: boolean;
  serverError: string | null;
  onSubmit: (values: StaffFormSubmitValues) => void;
  onClose: () => void;
}

interface FieldErrors {
  name?: string;
  email?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function StaffFormModal({
  staff,
  availableServices,
  isSubmitting,
  serverError,
  onSubmit,
  onClose,
}: StaffFormModalProps) {
  const [name, setName] = useState(staff?.name ?? "");
  const [email, setEmail] = useState(staff?.email ?? "");
  const [phone, setPhone] = useState(staff?.phone ?? "");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(staff?.serviceIds ?? []);
  const [isActive, setIsActive] = useState(staff?.isActive ?? true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
      serviceIds: selectedServiceIds,
      isActive,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-4">
      <div className="animate-fade-in-up w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-stone-900">{staff ? "Edit staff" : "Add staff"}</h2>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
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

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : staff ? "Save changes" : "Add staff"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
