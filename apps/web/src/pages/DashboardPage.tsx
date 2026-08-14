import { Link } from "react-router-dom";
import { useMyBusiness } from "../lib/business";
import { DashboardLayout } from "../components/DashboardLayout";

function OnlineBookingCard() {
  const { data } = useMyBusiness();
  const business = data?.business;

  if (!business) {
    return null;
  }

  const bookingUrl = `${window.location.origin}/book/${business.slug}`;

  return (
    <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-stone-900">Online booking</h2>
      <p className="mt-1 text-sm text-stone-500">
        {business.isPublicBookingEnabled
          ? "Your customers can book appointments online."
          : "Online booking is currently turned off."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={bookingUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          Open booking page
        </a>
        <Link
          to="/settings"
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
        >
          Manage
        </Link>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { data } = useMyBusiness();

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold text-stone-900">
        Welcome{data?.business ? `, ${data.business.name}` : ""}
      </h1>
      <p className="mt-1 text-sm text-stone-500">Manage your services, staff, customers, and bookings from here.</p>

      <OnlineBookingCard />
    </DashboardLayout>
  );
}
