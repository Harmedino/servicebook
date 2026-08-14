import { useEffect, useState, type FormEvent } from "react";
import { useMyBusiness, useUpdateBusiness } from "../lib/business";
import { TIMEZONES } from "../lib/timezones";
import { ApiError } from "../lib/apiClient";
import { FormField } from "./FormField";
import { Button } from "./ui/Button";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  name?: string;
  email?: string;
  website?: string;
}

export function BusinessInfoSection() {
  const { data, isPending: isBusinessLoading } = useMyBusiness();
  const updateBusiness = useUpdateBusiness();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
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
      setWebsite(data.business.website ?? "");
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
    if (website.trim()) {
      try {
        new URL(website.trim());
      } catch {
        errors.website = "Enter a valid URL, including https://";
      }
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
        website: website.trim() || undefined,
        timezone,
      });
      setSuccessMessage("Business information updated.");
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  if (isBusinessLoading) {
    return (
      <div className="max-w-lg">
        <p className="text-sm text-stone-500">Loading…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-lg space-y-4">
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
      <FormField
        label="Website"
        type="url"
        value={website}
        onChange={setWebsite}
        error={fieldErrors.website}
        disabled={updateBusiness.isPending}
      />

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
        <span className="mt-1 block text-xs text-stone-500">
          All appointment times are shown in this timezone. Changing it doesn&apos;t alter existing bookings.
        </span>
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

      <Button type="submit" isLoading={updateBusiness.isPending}>
        {updateBusiness.isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
