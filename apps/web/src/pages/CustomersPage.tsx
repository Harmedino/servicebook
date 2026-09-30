import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import { Plus } from "lucide-react";
import type { CustomerAppointmentFilter, CustomerProfile, CustomerSort } from "@servicebook/types";
import { useCreateCustomer, useCustomers, useUpdateCustomer } from "../lib/customers";
import { useMyBusiness } from "../lib/business";
import { ApiError } from "../lib/apiClient";
import { CustomerFormModal, type CustomerFormSubmitValues } from "../components/CustomerFormModal";
import { DashboardLayout } from "../components/DashboardLayout";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { CardListSkeleton } from "../components/ui/Skeleton";
import { Avatar } from "../components/ui/Avatar";

const PAGE_SIZE = 25;

const FILTER_OPTIONS: { value: CustomerAppointmentFilter; label: string }[] = [
  { value: "all", label: "All customers" },
  { value: "upcoming", label: "Upcoming appointments" },
  { value: "past", label: "Past appointments" },
];

const SORT_OPTIONS: { value: CustomerSort; label: string }[] = [
  { value: "recent", label: "Recently active" },
  { value: "name", label: "Name (A–Z)" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
];

export function CustomersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<CustomerSort>("recent");
  const [filter, setFilter] = useState<CustomerAppointmentFilter>("all");
  const [page, setPage] = useState(1);

  const { data: businessData } = useMyBusiness();
  const timezone = businessData?.business?.timezone ?? "UTC";

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Any change to what's being asked for invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sort, filter]);

  const { data, isPending, isError } = useCustomers({
    q: debouncedSearch || undefined,
    page,
    limit: PAGE_SIZE,
    sort,
    filter,
  });
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  // undefined = modal closed, null = adding, a CustomerProfile = editing
  const [modalCustomer, setModalCustomer] = useState<CustomerProfile | null | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const customers = data?.customers ?? [];
  const pagination = data?.pagination;
  const isSearching = debouncedSearch.length > 0;
  const hasActiveFilters = isSearching || filter !== "all";

  function openAddModal() {
    setFormError(null);
    setModalCustomer(null);
  }

  function openEditModal(customer: CustomerProfile) {
    setFormError(null);
    setModalCustomer(customer);
  }

  function closeModal() {
    setModalCustomer(undefined);
    setFormError(null);
  }

  async function handleSubmit(values: CustomerFormSubmitValues) {
    setFormError(null);
    try {
      if (modalCustomer) {
        await updateCustomer.mutateAsync({ id: modalCustomer.id, ...values });
        setSuccessMessage("Customer updated.");
      } else {
        await createCustomer.mutateAsync(values);
        setSuccessMessage("Customer added.");
      }
      closeModal();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  function formatLastAppointment(iso?: string): string {
    return iso ? formatInTimeZone(new Date(iso), timezone, "MMM d, yyyy") : "—";
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Customers"
        description="Manage your customers and their contact information."
        actions={
          <Button onClick={openAddModal}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add customer
          </Button>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search customers…"
          className="w-full max-w-sm rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as CustomerAppointmentFilter)}
          className="rounded-lg border border-stone-300 bg-surface px-2.5 py-1.5 text-sm text-stone-700 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        >
          {FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as CustomerSort)}
          className="rounded-lg border border-stone-300 bg-surface px-2.5 py-1.5 text-sm text-stone-700 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        {successMessage && (
          <p role="status" className="animate-fade-in-up mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {successMessage}
          </p>
        )}

        {isPending && <CardListSkeleton />}

        {isError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Couldn&apos;t load customers. Please refresh the page.
          </p>
        )}

        {!isPending && !isError && customers.length === 0 && !hasActiveFilters && (
          <EmptyState
            title="No customers yet"
            description="Customers will appear here when you add them or when they make their first booking."
            action={
              <Button onClick={openAddModal}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add customer
              </Button>
            }
          />
        )}

        {!isPending && !isError && customers.length === 0 && hasActiveFilters && (
          <p className="rounded-lg border border-dashed border-stone-300 px-6 py-8 text-center text-sm text-stone-500">
            No customers match these filters.
          </p>
        )}

        {!isPending && !isError && customers.length > 0 && (
          <>
            <table className="hidden w-full overflow-hidden rounded-xl border border-stone-200 bg-surface text-sm md:table">
              <thead className="bg-stone-50 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Appointments</th>
                  <th className="px-4 py-3">Last appointment</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-4 py-3 font-medium text-stone-900">
                      <Link to={`/customers/${customer.id}`} className="flex items-center gap-2.5 hover:text-brand-700">
                        <Avatar name={customer.name} size="sm" />
                        {customer.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{customer.phone}</td>
                    <td className="px-4 py-3 text-stone-600">{customer.email ?? "—"}</td>
                    <td className="px-4 py-3 text-stone-600">{customer.appointmentCount ?? 0}</td>
                    <td className="px-4 py-3 text-stone-600">{formatLastAppointment(customer.lastAppointmentAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEditModal(customer)}
                        className="font-medium text-brand-700 hover:text-brand-800"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="space-y-3 md:hidden">
              {customers.map((customer) => (
                <li key={customer.id} className="rounded-xl border border-stone-200 bg-surface p-4">
                  <Link to={`/customers/${customer.id}`} className="flex items-center gap-2.5 font-medium text-stone-900 hover:text-brand-700">
                    <Avatar name={customer.name} size="sm" />
                    {customer.name}
                  </Link>
                  <p className="mt-0.5 pl-[calc(2rem+0.625rem)] text-sm text-stone-500">{customer.phone}</p>
                  {customer.email && <p className="text-sm text-stone-500">{customer.email}</p>}
                  <p className="mt-1 text-xs text-stone-500">
                    {customer.appointmentCount ?? 0} appointment{customer.appointmentCount === 1 ? "" : "s"} · Last:{" "}
                    {formatLastAppointment(customer.lastAppointmentAt)}
                  </p>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => openEditModal(customer)}
                      className="text-sm font-medium text-brand-700 hover:text-brand-800"
                    >
                      Edit
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-stone-500">
                  Page {pagination.page} of {pagination.totalPages} · {pagination.total} customer
                  {pagination.total === 1 ? "" : "s"}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={pagination.page <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {modalCustomer !== undefined && (
        <CustomerFormModal
          customer={modalCustomer}
          isSubmitting={createCustomer.isPending || updateCustomer.isPending}
          serverError={formError}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}
    </DashboardLayout>
  );
}
