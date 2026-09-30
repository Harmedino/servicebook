import { useState, type FormEvent } from "react";
import type { ServiceProfile, StaffProfile } from "@servicebook/types";
import { FormField } from "./FormField";
import { ImageUpload } from "./ImageUpload";
import { useEscapeToClose } from "../lib/useEscapeToClose";
import { formatDuration } from "../lib/format";
import { Button } from "./ui/Button";

export interface ServiceFormSubmitValues {
  name: string;
  description?: string;
  /** "" removes an existing photo. */
  imageUrl?: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
  staffIds: string[];
}

interface ServiceFormModalProps {
  /** null = creating a new service, a ServiceProfile = editing an existing one */
  service: ServiceProfile | null;
  /** Active staff plus anyone already assigned to this service, so an existing assignment is never silently dropped on save. */
  availableStaff: StaffProfile[];
  isSubmitting: boolean;
  serverError: string | null;
  onSubmit: (values: ServiceFormSubmitValues) => void;
  onClose: () => void;
}

interface FieldErrors {
  name?: string;
  price?: string;
  durationMinutes?: string;
}

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

const selectClassName =
  "mt-1 w-full rounded-lg border border-stone-300 bg-surface px-3 py-2 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:bg-stone-100";

export function ServiceFormModal({
  service,
  availableStaff,
  isSubmitting,
  serverError,
  onSubmit,
  onClose,
}: ServiceFormModalProps) {
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [imageUrl, setImageUrl] = useState(service?.imageUrl ?? "");
  const [price, setPrice] = useState(service ? String(service.price) : "");
  const [durationMode, setDurationMode] = useState<"preset" | "custom">(
    service && !DURATION_PRESETS.includes(service.durationMinutes) ? "custom" : "preset",
  );
  const [durationMinutes, setDurationMinutes] = useState(service ? String(service.durationMinutes) : "30");
  const [isActive, setIsActive] = useState(service?.isActive ?? true);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(service?.staffIds ?? []);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEscapeToClose(onClose);

  function toggleStaff(id: string) {
    setSelectedStaffIds((current) => (current.includes(id) ? current.filter((staffId) => staffId !== id) : [...current, id]));
  }

  function handleDurationSelect(value: string) {
    if (value === "custom") {
      setDurationMode("custom");
      return;
    }
    setDurationMode("preset");
    setDurationMinutes(value);
  }

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!name.trim()) {
      errors.name = "Service name is required";
    }

    const priceValue = Number(price);
    if (price.trim() === "" || Number.isNaN(priceValue) || priceValue < 0) {
      errors.price = "Enter a valid price";
    } else if (!PRICE_PATTERN.test(price.trim())) {
      errors.price = "Price can have at most 2 decimal places";
    } else if (priceValue > 100_000) {
      errors.price = "Price is unreasonably large";
    }

    const durationValue = Number(durationMinutes);
    if (durationMinutes.trim() === "" || !Number.isInteger(durationValue) || durationValue < 1) {
      errors.durationMinutes = "Enter a duration in whole minutes";
    } else if (durationValue > 1440) {
      errors.durationMinutes = "Duration must be less than 24 hours";
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
      description: description.trim() || undefined,
      // Editing: send "" to clear a removed photo. Creating: omit when empty.
      imageUrl: service ? imageUrl : imageUrl || undefined,
      price: Number(price),
      durationMinutes: Number(durationMinutes),
      isActive,
      staffIds: selectedStaffIds,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-8">
      <div className="animate-fade-in-up w-full max-w-md rounded-xl border border-stone-200 bg-surface p-6 shadow-[var(--shadow-elevated)]">
        <h2 className="text-lg font-semibold text-stone-900">{service ? "Edit service" : "Add service"}</h2>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          <ImageUpload
            label="Photo"
            hint="Optional. Shown on your booking page."
            value={imageUrl}
            onChange={setImageUrl}
            shape="card"
            disabled={isSubmitting}
          />
          <FormField
            label="Service name"
            type="text"
            value={name}
            onChange={setName}
            error={fieldErrors.name}
            disabled={isSubmitting}
          />

          <label className="block">
            <span className="text-sm font-medium text-stone-700">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:bg-stone-100"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Price ($)"
              type="number"
              value={price}
              onChange={setPrice}
              error={fieldErrors.price}
              disabled={isSubmitting}
            />
            <label className="block">
              <span className="text-sm font-medium text-stone-700">Duration</span>
              <select
                value={durationMode === "custom" ? "custom" : durationMinutes}
                onChange={(event) => handleDurationSelect(event.target.value)}
                disabled={isSubmitting}
                className={selectClassName}
              >
                {DURATION_PRESETS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {formatDuration(minutes)}
                  </option>
                ))}
                <option value="custom">Custom…</option>
              </select>
              {durationMode === "custom" && (
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(event.target.value)}
                  disabled={isSubmitting}
                  placeholder="Minutes"
                  className={`${selectClassName} mt-2`}
                />
              )}
              {fieldErrors.durationMinutes && <p className="mt-1 text-xs text-red-600">{fieldErrors.durationMinutes}</p>}
            </label>
          </div>

          <div>
            <span className="text-sm font-medium text-stone-700">Performed by</span>
            {availableStaff.length === 0 ? (
              <p className="mt-1 text-sm text-stone-500">Add a staff member first so you can assign them here.</p>
            ) : (
              <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-lg border border-stone-200 p-3">
                {availableStaff.map((staff) => (
                  <label key={staff.id} className="flex items-center gap-2 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      checked={selectedStaffIds.includes(staff.id)}
                      onChange={() => toggleStaff(staff.id)}
                      disabled={isSubmitting}
                      className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500/40"
                    />
                    {staff.name}
                    {!staff.isActive && <span className="text-xs text-stone-400">(inactive)</span>}
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
            Active — customers can book this service
          </label>

          {serverError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {serverError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isSubmitting ? "Saving…" : service ? "Save changes" : "Create Service"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
