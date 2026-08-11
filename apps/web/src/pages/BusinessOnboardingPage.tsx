import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateBusiness } from "../lib/business";
import { TIMEZONES, detectTimezone } from "../lib/timezones";
import { ApiError } from "../lib/apiClient";
import { FormField } from "../components/FormField";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  name?: string;
  email?: string;
}

export function BusinessOnboardingPage() {
  const navigate = useNavigate();
  const createBusiness = useCreateBusiness();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState(detectTimezone());
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

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
    if (!validate()) {
      return;
    }

    try {
      await createBusiness.mutateAsync({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        description: description.trim() || undefined,
        timezone,
      });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-xl font-semibold text-stone-900">ServiceBook</span>
        </div>

        <div className="animate-fade-in-up rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-stone-900">Set up your business</h1>
          <p className="mt-1 text-sm text-stone-500">Add your business details so customers can find and book with you.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <FormField
              label="Business name"
              type="text"
              autoComplete="organization"
              value={name}
              onChange={setName}
              error={fieldErrors.name}
              disabled={createBusiness.isPending}
            />
            <FormField
              label="Business email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              error={fieldErrors.email}
              disabled={createBusiness.isPending}
            />
            <FormField
              label="Phone number"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={setPhone}
              disabled={createBusiness.isPending}
            />

            <label className="block">
              <span className="text-sm font-medium text-stone-700">Business description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={createBusiness.isPending}
                rows={3}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:bg-stone-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone-700">Timezone</span>
              <select
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                disabled={createBusiness.isPending}
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
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={createBusiness.isPending}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createBusiness.isPending ? "Creating…" : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
