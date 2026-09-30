import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { ApiError } from "../lib/apiClient";
import { FormField } from "../components/FormField";
import { PasswordInput } from "../components/PasswordInput";
import { Button } from "../components/ui/Button";
import { AuthBrandPanel } from "../components/AuthBrandPanel";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!name.trim()) {
      errors.name = "Name is required";
    }
    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!EMAIL_PATTERN.test(email)) {
      errors.email = "Enter a valid email address";
    }
    if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      errors.password = "Password must contain at least one letter and one number";
    }
    if (confirmPassword !== password) {
      errors.confirmPassword = "Passwords do not match";
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

    setIsSubmitting(true);
    try {
      await register(name, email, password);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <AuthBrandPanel
        headline="Get your business online in minutes."
        description="Set up services, staff and availability, then start taking bookings."
      />

      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <Link to="/" className="text-xl font-semibold tracking-tight text-stone-900">
              ServiceBook
            </Link>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Create your account</h1>
          <p className="mt-1 text-sm text-stone-500">Start managing your bookings with ServiceBook.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <FormField
              label="Name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={setName}
              error={fieldErrors.name}
              disabled={isSubmitting}
            />
            <FormField
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              error={fieldErrors.email}
              disabled={isSubmitting}
            />
            <PasswordInput
              label="Password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              error={fieldErrors.password}
              disabled={isSubmitting}
            />
            <PasswordInput
              label="Confirm password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              error={fieldErrors.confirmPassword}
              disabled={isSubmitting}
            />

            {serverError && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {serverError}
              </p>
            )}

            <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
              {isSubmitting ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-500">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-brand-700 hover:text-brand-800">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
