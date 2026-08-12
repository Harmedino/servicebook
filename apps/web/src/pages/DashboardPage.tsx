import { useMyBusiness } from "../lib/business";
import { DashboardLayout } from "../components/DashboardLayout";

export function DashboardPage() {
  const { data } = useMyBusiness();

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold text-stone-900">
        Welcome{data?.business ? `, ${data.business.name}` : ""}
      </h1>
      <p className="mt-1 text-sm text-stone-500">
        Owner features (bookings, staff, customers) land in upcoming steps.
      </p>
    </DashboardLayout>
  );
}
