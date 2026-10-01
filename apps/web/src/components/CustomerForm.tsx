import { useState, type FormEvent } from "react";
import type { CustomerProfile } from "@servicebook/types";
import { FormField } from "./FormField";
import { Button } from "./ui/Button";

export interface CustomerFormSubmitValues {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

interface CustomerFormProps {
  /** null = adding a new customer, a CustomerProfile = editing an existing one */
  customer: CustomerProfile | null;
  isSubmitting: boolean;
  serverError: string | null;
  onSubmit: (values: CustomerFormSubmitValues) => void;
  onCancel: () => void;
}

interface FieldErrors {
  name?: string;
  phone?: string;
  email?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CustomerForm({ customer, isSubmitting, serverError, onSubmit, onCancel }: CustomerFormProps) {
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!name.trim()) {
      errors.name = "Customer name is required";
    }
    if (!phone.trim()) {
      errors.phone = "Phone number is required";
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
      phone: phone.trim(),
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormField
        label="Name"
        type="text"
        value={name}
        onChange={setName}
        error={fieldErrors.name}
        disabled={isSubmitting}
      />
      <FormField
        label="Phone"
        type="tel"
        value={phone}
        onChange={setPhone}
        error={fieldErrors.phone}
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

      <label className="block">
        <span className="text-sm font-medium text-stone-700">Notes</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={isSubmitting}
          rows={3}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:bg-stone-100"
        />
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
          {isSubmitting ? "Saving…" : customer ? "Save changes" : "Add customer"}
        </Button>
      </div>
    </form>
  );
}
