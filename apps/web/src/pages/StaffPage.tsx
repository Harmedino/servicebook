import { useState } from "react";
import { Link } from "react-router-dom";
import type { ServiceProfile, StaffProfile } from "@servicebook/types";
import { useCreateStaff, useStaffList, useUpdateStaff } from "../lib/staff";
import { useServices } from "../lib/services";
import { ApiError } from "../lib/apiClient";
import { StaffFormModal, type StaffFormSubmitValues } from "../components/StaffFormModal";
import { DashboardLayout } from "../components/DashboardLayout";

function resolveServiceNames(serviceIds: string[], services: ServiceProfile[]): string {
  if (serviceIds.length === 0) {
    return "No services assigned";
  }
  const nameById = new Map(services.map((service) => [service.id, service.name]));
  return serviceIds.map((id) => nameById.get(id) ?? "Unknown service").join(", ");
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-600"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function StaffLoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl border border-stone-200 bg-white" />
      ))}
    </div>
  );
}

export function StaffPage() {
  const { data, isPending, isError } = useStaffList();
  const { data: servicesData } = useServices();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();

  // undefined = modal closed, null = adding, a StaffProfile = editing
  const [modalStaff, setModalStaff] = useState<StaffProfile | null | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const staffMembers = data?.staff ?? [];
  const allServices = servicesData?.services ?? [];

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
      } else {
        await createStaff.mutateAsync(values);
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
    try {
      await updateStaff.mutateAsync({ id: staff.id, isActive: false });
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "Couldn't deactivate this staff member. Please try again.");
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Staff</h1>
          <p className="mt-1 text-sm text-stone-500">Manage the people who provide your services.</p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          + Add staff
        </button>
      </div>

      <div className="mt-6">
        {actionError && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {actionError}
          </p>
        )}

        {isPending && <StaffLoadingSkeleton />}

        {isError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Couldn&apos;t load staff. Please refresh the page.
          </p>
        )}

        {!isPending && !isError && staffMembers.length === 0 && (
          <div className="animate-fade-in-up rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
            <h2 className="text-base font-semibold text-stone-900">No staff yet</h2>
            <p className="mt-1 text-sm text-stone-500">
              Add your first staff member and assign the services they provide.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              + Add staff
            </button>
          </div>
        )}

        {!isPending && !isError && staffMembers.length > 0 && (
          <>
            <table className="hidden w-full overflow-hidden rounded-2xl border border-stone-200 bg-white text-sm shadow-sm md:table">
              <thead className="bg-stone-50 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Services</th>
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
                    <td className="px-4 py-3">
                      <StatusBadge isActive={staff.isActive} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEditModal(staff)}
                        className="font-medium text-brand-700 hover:text-brand-800"
                      >
                        Edit
                      </button>
                      {staff.isActive && (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(staff)}
                          className="ml-4 font-medium text-stone-500 hover:text-red-600"
                        >
                          Deactivate
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
                    </div>
                    <StatusBadge isActive={staff.isActive} />
                  </div>
                  <div className="mt-3 flex gap-4 text-sm">
                    <button
                      type="button"
                      onClick={() => openEditModal(staff)}
                      className="font-medium text-brand-700 hover:text-brand-800"
                    >
                      Edit
                    </button>
                    {staff.isActive && (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(staff)}
                        className="font-medium text-stone-500 hover:text-red-600"
                      >
                        Deactivate
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
