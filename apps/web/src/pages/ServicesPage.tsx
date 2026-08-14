import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ServiceProfile } from "@servicebook/types";
import { useCreateService, useDeactivateService, useServices, useUpdateService } from "../lib/services";
import { useStaffList } from "../lib/staff";
import { ApiError } from "../lib/apiClient";
import { ServiceFormModal, type ServiceFormSubmitValues } from "../components/ServiceFormModal";
import { DashboardLayout } from "../components/DashboardLayout";
import { formatDuration, formatPrice } from "../lib/format";

type StatusFilter = "all" | "active" | "inactive";

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

function ServicesLoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl border border-stone-200 bg-white" />
      ))}
    </div>
  );
}

export function ServicesPage() {
  const { data, isPending, isError } = useServices();
  const { data: staffData } = useStaffList();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deactivateService = useDeactivateService();

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // undefined = modal closed, null = creating, a ServiceProfile = editing
  const [modalService, setModalService] = useState<ServiceProfile | null | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const allServices = data?.services ?? [];
  const allStaff = staffData?.staff ?? [];
  const staffNameById = useMemo(() => new Map(allStaff.map((staff) => [staff.id, staff.name])), [allStaff]);

  const search = searchInput.trim().toLowerCase();
  const isFiltering = search.length > 0 || statusFilter !== "all";

  const services = useMemo(() => {
    return allServices.filter((service) => {
      if (statusFilter === "active" && !service.isActive) return false;
      if (statusFilter === "inactive" && service.isActive) return false;
      if (search && !service.name.toLowerCase().includes(search)) return false;
      return true;
    });
  }, [allServices, search, statusFilter]);

  function openCreateModal() {
    setFormError(null);
    setModalService(null);
  }

  function openEditModal(service: ServiceProfile) {
    setFormError(null);
    setModalService(service);
  }

  function closeModal() {
    setModalService(undefined);
    setFormError(null);
  }

  async function handleSubmit(values: ServiceFormSubmitValues) {
    setFormError(null);
    try {
      if (modalService) {
        await updateService.mutateAsync({ id: modalService.id, ...values });
        setSuccessMessage("Service updated.");
      } else {
        await createService.mutateAsync(values);
        setSuccessMessage("Service created.");
      }
      closeModal();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  async function handleDeactivate(service: ServiceProfile) {
    if (!window.confirm(`Deactivate "${service.name}"? Customers won't be able to book it anymore.`)) {
      return;
    }
    setActionError(null);
    setSuccessMessage(null);
    try {
      await deactivateService.mutateAsync(service.id);
      setSuccessMessage("Service deactivated.");
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "Couldn't deactivate this service. Please try again.");
    }
  }

  async function handleActivate(service: ServiceProfile) {
    setActionError(null);
    setSuccessMessage(null);
    try {
      await updateService.mutateAsync({ id: service.id, isActive: true });
      setSuccessMessage("Service activated.");
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "Couldn't activate this service. Please try again.");
    }
  }

  function staffNames(service: ServiceProfile): string {
    if (service.staffIds.length === 0) return "—";
    return service.staffIds.map((id) => staffNameById.get(id) ?? "Unknown").join(", ");
  }

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Services</h1>
          <p className="mt-1 text-sm text-stone-500">Manage the services your customers can book.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          + Add Service
        </button>
      </div>

      {allServices.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search services…"
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

        {isPending && <ServicesLoadingSkeleton />}

        {isError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Couldn&apos;t load services. Please refresh the page.
          </p>
        )}

        {!isPending && !isError && allServices.length === 0 && (
          <div className="animate-fade-in-up rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
            <h2 className="text-base font-semibold text-stone-900">You haven&apos;t added any services yet</h2>
            <p className="mt-1 text-sm text-stone-500">Add your services so customers can book them online.</p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              + Add service
            </button>
          </div>
        )}

        {!isPending && !isError && allServices.length > 0 && services.length === 0 && (
          <p className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center text-sm text-stone-500">
            {isFiltering ? "No services match these filters." : "No services to show."}
          </p>
        )}

        {!isPending && !isError && services.length > 0 && (
          <>
            <table className="hidden w-full overflow-hidden rounded-2xl border border-stone-200 bg-white text-sm shadow-sm md:table">
              <thead className="bg-stone-50 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {services.map((service) => (
                  <tr key={service.id}>
                    <td className="px-4 py-3 font-medium text-stone-900">
                      <Link to={`/services/${service.id}`} className="hover:text-brand-700">
                        {service.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{formatDuration(service.durationMinutes)}</td>
                    <td className="px-4 py-3 text-stone-600">{formatPrice(service.price)}</td>
                    <td className="px-4 py-3 text-stone-600">{staffNames(service)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge isActive={service.isActive} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEditModal(service)}
                        className="font-medium text-brand-700 hover:text-brand-800"
                      >
                        Edit
                      </button>
                      {service.isActive ? (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(service)}
                          disabled={deactivateService.isPending}
                          className="ml-4 font-medium text-stone-500 hover:text-red-600 disabled:cursor-not-allowed"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleActivate(service)}
                          disabled={updateService.isPending}
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
              {services.map((service) => (
                <li key={service.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link to={`/services/${service.id}`} className="font-medium text-stone-900 hover:text-brand-700">
                        {service.name}
                      </Link>
                      <p className="mt-0.5 text-sm text-stone-500">
                        {formatDuration(service.durationMinutes)} · {formatPrice(service.price)}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-500">{staffNames(service)}</p>
                    </div>
                    <StatusBadge isActive={service.isActive} />
                  </div>
                  <div className="mt-3 flex gap-4 text-sm">
                    <button
                      type="button"
                      onClick={() => openEditModal(service)}
                      className="font-medium text-brand-700 hover:text-brand-800"
                    >
                      Edit
                    </button>
                    {service.isActive ? (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(service)}
                        disabled={deactivateService.isPending}
                        className="font-medium text-stone-500 hover:text-red-600 disabled:cursor-not-allowed"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleActivate(service)}
                        disabled={updateService.isPending}
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

      {modalService !== undefined && (
        <ServiceFormModal
          service={modalService}
          availableStaff={allStaff}
          isSubmitting={createService.isPending || updateService.isPending}
          serverError={formError}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}
    </DashboardLayout>
  );
}
