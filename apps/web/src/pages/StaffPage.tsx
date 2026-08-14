import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import type { ServiceProfile, StaffProfile } from "@servicebook/types";
import { useCreateStaff, useStaffList, useUpdateStaff } from "../lib/staff";
import { useServices } from "../lib/services";
import { ApiError } from "../lib/apiClient";
import { StaffFormModal, type StaffFormSubmitValues } from "../components/StaffFormModal";
import { DashboardLayout } from "../components/DashboardLayout";
import { Button } from "../components/ui/Button";
import { ActiveBadge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { CardListSkeleton } from "../components/ui/Skeleton";

type StatusFilter = "all" | "active" | "inactive";

function resolveServiceNames(serviceIds: string[], services: ServiceProfile[]): string {
  if (serviceIds.length === 0) {
    return "No services assigned";
  }
  const nameById = new Map(services.map((service) => [service.id, service.name]));
  return serviceIds.map((id) => nameById.get(id) ?? "Unknown service").join(", ");
}

export function StaffPage() {
  const { data, isPending, isError } = useStaffList();
  const { data: servicesData } = useServices();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // undefined = modal closed, null = adding, a StaffProfile = editing
  const [modalStaff, setModalStaff] = useState<StaffProfile | null | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const allStaffMembers = data?.staff ?? [];
  const allServices = servicesData?.services ?? [];

  const search = searchInput.trim().toLowerCase();
  const isFiltering = search.length > 0 || statusFilter !== "all";

  const staffMembers = useMemo(() => {
    return allStaffMembers.filter((staff) => {
      if (statusFilter === "active" && !staff.isActive) return false;
      if (statusFilter === "inactive" && staff.isActive) return false;
      if (search) {
        const matchesName = staff.name.toLowerCase().includes(search);
        const matchesEmail = staff.email?.toLowerCase().includes(search) ?? false;
        if (!matchesName && !matchesEmail) return false;
      }
      return true;
    });
  }, [allStaffMembers, search, statusFilter]);

  function openAddModal() {
    setFormError(null);
    setModalStaff(null);
  }

  function openEditModal(staff: StaffProfile) {
    setFormError(null);
    setModalStaff(staff);
  }

  function closeModal() {
    setModalStaff(undefined);
    setFormError(null);
  }

  async function handleSubmit(values: StaffFormSubmitValues) {
    setFormError(null);
    try {
      if (modalStaff) {
        await updateStaff.mutateAsync({ id: modalStaff.id, ...values });
        setSuccessMessage("Staff member updated.");
      } else {
        await createStaff.mutateAsync(values);
        setSuccessMessage("Staff member added.");
      }
      closeModal();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  async function handleDeactivate(staff: StaffProfile) {
    if (!window.confirm(`Deactivate "${staff.name}"? They won't be assignable to new bookings.`)) {
      return;
    }
    setActionError(null);
    setSuccessMessage(null);
    try {
      await updateStaff.mutateAsync({ id: staff.id, isActive: false });
      setSuccessMessage("Staff member deactivated.");
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "Couldn't deactivate this staff member. Please try again.");
    }
  }

  async function handleActivate(staff: StaffProfile) {
    setActionError(null);
    setSuccessMessage(null);
    try {
      await updateStaff.mutateAsync({ id: staff.id, isActive: true });
      setSuccessMessage("Staff member activated.");
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "Couldn't activate this staff member. Please try again.");
    }
  }

  // Active services plus anything the currently-edited staff member already has,
  // so an existing assignment to a since-deactivated service is never hidden and
  // silently dropped when the form is saved.
  const assignableServices = allServices.filter(
    (service) => service.isActive || (modalStaff?.serviceIds.includes(service.id) ?? false),
  );

  return (
    <DashboardLayout>
      <PageHeader
        title="Staff"
        description="Manage your team and their availability."
        actions={
          <Button onClick={openAddModal}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add staff
          </Button>
        }
      />

      {allStaffMembers.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name or email…"
            className="w-full max-w-xs rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-700 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      )}

      <div className="mt-6">
        {successMessage && (
          <p role="status" className="animate-fade-in-up mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {successMessage}
          </p>
        )}
        {actionError && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {actionError}
          </p>
        )}

        {isPending && <CardListSkeleton />}

        {isError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Couldn&apos;t load staff. Please refresh the page.
          </p>
        )}

        {!isPending && !isError && allStaffMembers.length === 0 && (
          <EmptyState
            title="You haven't added any team members yet"
            description="Add staff so customers can book appointments with them."
            action={
              <Button onClick={openAddModal}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add staff
              </Button>
            }
          />
        )}

        {!isPending && !isError && allStaffMembers.length > 0 && staffMembers.length === 0 && (
          <p className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center text-sm text-stone-500">
            {isFiltering ? "No staff match these filters." : "No staff to show."}
          </p>
        )}

        {!isPending && !isError && staffMembers.length > 0 && (
          <>
            <table className="hidden w-full overflow-hidden rounded-2xl border border-stone-200 bg-white text-sm shadow-sm md:table">
              <thead className="bg-stone-50 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Services</th>
                  <th className="px-4 py-3">Today</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {staffMembers.map((staff) => (
                  <tr key={staff.id}>
                    <td className="px-4 py-3 font-medium text-stone-900">
                      <Link to={`/staff/${staff.id}`} className="hover:text-brand-700">
                        {staff.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {staff.email && <div>{staff.email}</div>}
                      {staff.phone && <div>{staff.phone}</div>}
                      {!staff.email && !staff.phone && "—"}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-stone-600">
                      {resolveServiceNames(staff.serviceIds, allServices)}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {staff.todayAppointmentCount ?? 0} appointment{staff.todayAppointmentCount === 1 ? "" : "s"}
                    </td>
                    <td className="px-4 py-3">
                      <ActiveBadge isActive={staff.isActive} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEditModal(staff)}
                        className="font-medium text-brand-700 hover:text-brand-800"
                      >
                        Edit
                      </button>
                      {staff.isActive ? (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(staff)}
                          disabled={updateStaff.isPending}
                          className="ml-4 font-medium text-stone-500 hover:text-red-600 disabled:cursor-not-allowed"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleActivate(staff)}
                          disabled={updateStaff.isPending}
                          className="ml-4 font-medium text-brand-700 hover:text-brand-800 disabled:cursor-not-allowed"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="space-y-3 md:hidden">
              {staffMembers.map((staff) => (
                <li key={staff.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link to={`/staff/${staff.id}`} className="font-medium text-stone-900 hover:text-brand-700">
                        {staff.name}
                      </Link>
                      {staff.email && <p className="mt-0.5 text-sm text-stone-500">{staff.email}</p>}
                      {staff.phone && <p className="text-sm text-stone-500">{staff.phone}</p>}
                      <p className="mt-1 text-sm text-stone-500">{resolveServiceNames(staff.serviceIds, allServices)}</p>
                      <p className="text-xs text-stone-500">
                        {staff.todayAppointmentCount ?? 0} appointment{staff.todayAppointmentCount === 1 ? "" : "s"} today
                      </p>
                    </div>
                    <ActiveBadge isActive={staff.isActive} />
                  </div>
                  <div className="mt-3 flex gap-4 text-sm">
                    <button
                      type="button"
                      onClick={() => openEditModal(staff)}
                      className="font-medium text-brand-700 hover:text-brand-800"
                    >
                      Edit
                    </button>
                    {staff.isActive ? (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(staff)}
                        disabled={updateStaff.isPending}
                        className="font-medium text-stone-500 hover:text-red-600 disabled:cursor-not-allowed"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleActivate(staff)}
                        disabled={updateStaff.isPending}
                        className="font-medium text-brand-700 hover:text-brand-800 disabled:cursor-not-allowed"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {modalStaff !== undefined && (
        <StaffFormModal
          staff={modalStaff}
          availableServices={assignableServices}
          isSubmitting={createStaff.isPending || updateStaff.isPending}
          serverError={formError}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}
    </DashboardLayout>
  );
}
