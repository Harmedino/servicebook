import { Link, useParams } from "react-router-dom";
import { useStaffList } from "../lib/staff";
import { useServices } from "../lib/services";
import { StaffAvailabilityEditor } from "../components/StaffAvailabilityEditor";
import { DashboardLayout } from "../components/DashboardLayout";

export function StaffDetailPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const { data: staffData, isPending, isError } = useStaffList();
  const { data: servicesData } = useServices();

  const staff = staffData?.staff.find((member) => member.id === staffId);
  const services = servicesData?.services ?? [];

  if (isPending) {
    return (
      <DashboardLayout>
        <p className="text-sm text-stone-500">Loading…</p>
      </DashboardLayout>
    );
  }

  if (isError || !staff) {
    return (
      <DashboardLayout>
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn&apos;t find that staff member.
        </p>
        <Link to="/staff" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:text-brand-800">
          ← Back to staff
        </Link>
      </DashboardLayout>
    );
  }

  const assignedServices = services.filter((service) => staff.serviceIds.includes(service.id));

  return (
    <DashboardLayout>
      <Link to="/staff" className="text-sm font-medium text-brand-700 hover:text-brand-800">
        ← Back to staff
      </Link>

      <h1 className="mt-3 text-2xl font-semibold text-stone-900">{staff.name}</h1>
      <p className="mt-1 text-sm text-stone-500">
        {staff.email ?? "No email"} · {staff.phone ?? "No phone"}
      </p>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Services</h2>
        {assignedServices.length === 0 ? (
          <p className="mt-1 text-sm text-stone-500">No services assigned yet.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {assignedServices.map((service) => (
              <li key={service.id} className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">
                {service.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <StaffAvailabilityEditor staffId={staff.id} />
      </div>
    </DashboardLayout>
  );
}
