import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { CustomerProfile } from "@servicebook/types";
import { useCreateCustomer, useCustomers, useUpdateCustomer } from "../lib/customers";
import { ApiError } from "../lib/apiClient";
import { CustomerFormModal, type CustomerFormSubmitValues } from "../components/CustomerFormModal";
import { DashboardLayout } from "../components/DashboardLayout";

function CustomersLoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl border border-stone-200 bg-white" />
      ))}
    </div>
  );
}

export function CustomersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const { data, isPending, isError } = useCustomers(debouncedSearch || undefined);
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  // undefined = modal closed, null = adding, a CustomerProfile = editing
  const [modalCustomer, setModalCustomer] = useState<CustomerProfile | null | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);

  const customers = data?.customers ?? [];
  const isSearching = debouncedSearch.length > 0;

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
      } else {
        await createCustomer.mutateAsync(values);
      }
      closeModal();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Customers</h1>
          <p className="mt-1 text-sm text-stone-500">Manage your customers and their contact information.</p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          + Add customer
        </button>
      </div>

      <div className="mt-4">
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search customers…"
          className="w-full max-w-sm rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>

      <div className="mt-6">
        {isPending && <CustomersLoadingSkeleton />}

        {isError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Couldn&apos;t load customers. Please refresh the page.
          </p>
        )}

        {!isPending && !isError && customers.length === 0 && !isSearching && (
          <div className="animate-fade-in-up rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
            <h2 className="text-base font-semibold text-stone-900">No customers yet</h2>
            <p className="mt-1 text-sm text-stone-500">
              Customers will appear here when you add them or when they make their first booking.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              + Add customer
            </button>
          </div>
        )}

        {!isPending && !isError && customers.length === 0 && isSearching && (
          <p className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center text-sm text-stone-500">
            No customers match &ldquo;{debouncedSearch}&rdquo;.
          </p>
        )}

        {!isPending && !isError && customers.length > 0 && (
          <>
            <table className="hidden w-full overflow-hidden rounded-2xl border border-stone-200 bg-white text-sm shadow-sm md:table">
              <thead className="bg-stone-50 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-4 py-3 font-medium text-stone-900">
                      <Link to={`/customers/${customer.id}`} className="hover:text-brand-700">
                        {customer.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{customer.phone}</td>
                    <td className="px-4 py-3 text-stone-600">{customer.email ?? "—"}</td>
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
                <li key={customer.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                  <Link to={`/customers/${customer.id}`} className="font-medium text-stone-900 hover:text-brand-700">
                    {customer.name}
                  </Link>
                  <p className="mt-0.5 text-sm text-stone-500">{customer.phone}</p>
                  {customer.email && <p className="text-sm text-stone-500">{customer.email}</p>}
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
