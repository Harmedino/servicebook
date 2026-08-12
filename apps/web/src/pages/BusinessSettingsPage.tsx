import { useEffect, useState, type FormEvent } from "react";
import { useMyBusiness, useUpdateBusiness } from "../lib/business";
import { TIMEZONES } from "../lib/timezones";
import { ApiError } from "../lib/apiClient";
import { FormField } from "../components/FormField";
import { DashboardLayout } from "../components/DashboardLayout";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  name?: string;
  email?: string;
}

export function BusinessSettingsPage() {
  const { data, isPending: isBusinessLoading } = useMyBusiness();
  const updateBusiness = useUpdateBusiness();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (data?.business) {
      setName(data.business.name);
      setDescription(data.business.description ?? "");
      setPhone(data.business.phone ?? "");
      setEmail(data.business.email ?? "");
      setAddress(data.business.address ?? "");
      setTimezone(data.business.timezone);
    }
  }, [data?.business]);

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!name.trim()) {
      errors.name = "Business name is required";
    }
    if (email.trim() && !EMAIL_PATTERN.test(email)) {
      errors.email = "Enter a valid email address";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setServerError(null);
    setSuccessMessage(null);
    if (!validate()) {
      return;
    }

    try {
      await updateBusiness.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        timezone,
      });
      setSuccessMessage("Business profile updated.");
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  if (isBusinessLoading) {
    return (
      <DashboardLayout>
        <p className="text-sm text-stone-500">Loading…</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-stone-900">Business profile</h1>
        <p className="mt-1 text-sm text-stone-500">Update the information customers and staff will see.</p>

        <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-6 space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <FormField
          label="Business name"
          type="text"
          value={name}
          onChange={setName}
          error={fieldErrors.name}
          disabled={updateBusiness.isPending}
        />
        <FormField
          label="Business email"
          type="email"
          value={email}
          onChange={setEmail}
          error={fieldErrors.email}
          disabled={updateBusiness.isPending}
        />
        <FormField label="Phone number" type="tel" value={phone} onChange={setPhone} disabled={updateBusiness.isPending} />
        <FormField label="Address" type="text" value={address} onChange={setAddress} disabled={updateBusiness.isPending} />

        <label className="block">
          <span className="text-sm font-medium text-stone-700">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={updateBusiness.isPending}
            rows={3}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:bg-stone-100"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">Timezone</span>
          <select
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            disabled={updateBusiness.isPending}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:bg-stone-100"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </label>

        {serverError && (
          <p role="alert" className="animate-fade-in-up rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        )}
        {successMessage && (
          <p role="status" className="animate-fade-in-up rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {successMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={updateBusiness.isPending}
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {updateBusiness.isPending ? "Saving…" : "Save changes"}
        </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
