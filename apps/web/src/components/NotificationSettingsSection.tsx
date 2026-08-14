import { useState } from "react";
import { useMyBusiness, useUpdateBusiness, type UpdateBusinessInput } from "../lib/business";
import { ApiError } from "../lib/apiClient";
import { Toggle } from "./Toggle";
import { Card } from "./ui/Card";

type NotificationField = keyof Pick<
  UpdateBusinessInput,
  "emailNotificationsEnabled" | "notifyCustomerOnBooking" | "notifyCustomerReminder" | "notifyOwnerOnBooking"
>;

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ label, description, checked, disabled, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-stone-900">{label}</p>
        <p className="mt-0.5 text-sm text-stone-500">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} label={label} />
    </div>
  );
}

export function NotificationSettingsSection() {
  const { data, isPending } = useMyBusiness();
  const updateBusiness = useUpdateBusiness();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const business = data?.business;

  async function handleToggle(field: NotificationField, value: boolean) {
    setError(null);
    setSuccessMessage(null);
    try {
      await updateBusiness.mutateAsync({ [field]: value });
      setSuccessMessage("Notification settings updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update this setting. Please try again.");
    }
  }

  if (isPending || !business) {
    return <p className="text-sm text-stone-500">Loading…</p>;
  }

  const masterEnabled = business.emailNotificationsEnabled;

  return (
    <Card className="max-w-lg p-5">
      <div className="divide-y divide-stone-100">
        <ToggleRow
          label="Email notifications"
          description="Turns all automatic emails on or off."
          checked={masterEnabled}
          disabled={updateBusiness.isPending}
          onChange={(value) => handleToggle("emailNotificationsEnabled", value)}
        />
        <ToggleRow
          label="Customer booking confirmation"
          description="Sent to the customer when a booking is created, cancelled, or rescheduled."
          checked={business.notifyCustomerOnBooking}
          disabled={updateBusiness.isPending || !masterEnabled}
          onChange={(value) => handleToggle("notifyCustomerOnBooking", value)}
        />
        <ToggleRow
          label="24-hour reminders"
          description="Sent to the customer about a day before their appointment."
          checked={business.notifyCustomerReminder}
          disabled={updateBusiness.isPending || !masterEnabled}
          onChange={(value) => handleToggle("notifyCustomerReminder", value)}
        />
        <ToggleRow
          label="New booking notification"
          description="Sent to your business email when a new booking comes in."
          checked={business.notifyOwnerOnBooking}
          disabled={updateBusiness.isPending || !masterEnabled}
          onChange={(value) => handleToggle("notifyOwnerOnBooking", value)}
        />
      </div>

      {error && (
        <p role="alert" className="animate-fade-in-up mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {successMessage && (
        <p role="status" className="animate-fade-in-up mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {successMessage}
        </p>
      )}
    </Card>
  );
}
