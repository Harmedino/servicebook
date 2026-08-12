import { useEffect, useState, type FormEvent } from "react";
import type { ServiceProfile } from "@servicebook/types";
import { FormField } from "./FormField";

export interface ServiceFormSubmitValues {
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
}

interface ServiceFormModalProps {
  /** null = creating a new service, a ServiceProfile = editing an existing one */
  service: ServiceProfile | null;
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

export function ServiceFormModal({ service, isSubmitting, serverError, onSubmit, onClose }: ServiceFormModalProps) {
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [price, setPrice] = useState(service ? String(service.price) : "");
  const [durationMinutes, setDurationMinutes] = useState(service ? String(service.durationMinutes) : "");
  const [isActive, setIsActive] = useState(service?.isActive ?? true);
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

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!name.trim()) {
      errors.name = "Service name is required";
    }

    const priceValue = Number(price);
    if (price.trim() === "" || Number.isNaN(priceValue) || priceValue < 0) {
      errors.price = "Enter a valid price";
    }

    const durationValue = Number(durationMinutes);
    if (durationMinutes.trim() === "" || !Number.isInteger(durationValue) || durationValue < 1) {
      errors.durationMinutes = "Enter a duration in whole minutes";
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
      price: Number(price),
      durationMinutes: Number(durationMinutes),
      isActive,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-4">
      <div className="animate-fade-in-up w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-stone-900">{service ? "Edit service" : "Add service"}</h2>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
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
            <FormField
              label="Duration (min)"
              type="number"
              value={durationMinutes}
              onChange={setDurationMinutes}
              error={fieldErrors.durationMinutes}
              disabled={isSubmitting}
            />
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
              {isSubmitting ? "Saving…" : service ? "Save changes" : "Create Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
