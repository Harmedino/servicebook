import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "../components/DashboardLayout";
import { BusinessInfoSection } from "../components/BusinessInfoSection";
import { BookingPageSection } from "../components/BookingPageSection";
import { BusinessHoursEditor } from "../components/BusinessHoursEditor";
import { NotificationSettingsSection } from "../components/NotificationSettingsSection";
import { SocialLinksSection } from "../components/SocialLinksSection";
import { PageHeader } from "../components/ui/PageHeader";

type Tab = "business" | "chat" | "booking-page" | "hours" | "notifications";

const TABS: { key: Tab; label: string; description: string }[] = [
  { key: "business", label: "Business", description: "Business information and contact details." },
  { key: "chat", label: "Chat apps", description: "WhatsApp, Instagram and other apps customers can reach you on." },
  { key: "booking-page", label: "Booking page", description: "Manage what customers see when they book online." },
  { key: "hours", label: "Business hours", description: "Configure when your business is open." },
  { key: "notifications", label: "Notifications", description: "Manage the emails ServiceBook sends automatically." },
];

export function SettingsPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => (TABS.some((entry) => entry.key === searchParams.get("tab")) ? (searchParams.get("tab") as Tab) : "business"));
  const activeTab = TABS.find((entry) => entry.key === tab) ?? TABS[0];

  return (
    <DashboardLayout>
      <PageHeader title="Settings" description="Manage your business configuration." />

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
          {TABS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTab(entry.key)}
              className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors lg:shrink ${
                tab === entry.key ? "bg-brand-50 text-brand-700" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </nav>

        <div className="max-w-2xl">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-stone-900">{activeTab.label}</h2>
            <p className="mt-0.5 text-sm text-stone-500">{activeTab.description}</p>
          </div>

          <div className="animate-fade-in-up">
            {tab === "business" && <BusinessInfoSection />}
            {tab === "chat" && <SocialLinksSection />}
            {tab === "booking-page" && <BookingPageSection />}
            {tab === "hours" && <BusinessHoursEditor />}
            {tab === "notifications" && <NotificationSettingsSection />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
