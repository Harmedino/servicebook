import { useState } from "react";
import { DashboardLayout } from "../components/DashboardLayout";
import { BusinessInfoSection } from "../components/BusinessInfoSection";
import { BookingPageSection } from "../components/BookingPageSection";
import { BusinessHoursEditor } from "../components/BusinessHoursEditor";
import { NotificationSettingsSection } from "../components/NotificationSettingsSection";

type Tab = "business" | "booking-page" | "hours" | "notifications";

const TABS: { key: Tab; label: string; description: string }[] = [
  { key: "business", label: "Business", description: "Business information and contact details." },
  { key: "booking-page", label: "Booking page", description: "Manage what customers see." },
  { key: "hours", label: "Business hours", description: "Configure when your business is open." },
  { key: "notifications", label: "Notifications", description: "Manage automatic booking emails." },
];

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>("business");
  const activeTab = TABS.find((entry) => entry.key === tab) ?? TABS[0];

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold text-stone-900">Settings</h1>
      <p className="mt-1 text-sm text-stone-500">{activeTab.description}</p>

      <div className="mt-4 flex gap-2 overflow-x-auto">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === entry.key ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="animate-fade-in-up mt-6 max-w-2xl">
        {tab === "business" && <BusinessInfoSection />}
        {tab === "booking-page" && <BookingPageSection />}
        {tab === "hours" && <BusinessHoursEditor />}
        {tab === "notifications" && <NotificationSettingsSection />}
      </div>
    </DashboardLayout>
  );
}
