import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCustomer, useUpdateCustomer } from "../lib/customers";
import { CustomerFormModal, type CustomerFormSubmitValues } from "../components/CustomerFormModal";
import { ApiError } from "../lib/apiClient";
import { DashboardLayout } from "../components/DashboardLayout";

export function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const { data, isPending, isError } = useCustomer(customerId ?? "");
  const updateCustomer = useUpdateCustomer();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (isPending) {
    return (
      <DashboardLayout>
        <p className="text-sm text-stone-500">Loading…</p>
      </DashboardLayout>
    );
  }

  if (isError || !data?.customer) {
    return (
      <DashboardLayout>
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn&apos;t find that customer.
        </p>
        <Link to="/customers" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:text-brand-800">
          ← Back to customers
        </Link>
      </DashboardLayout>
    );
  }

  const customer = data.customer;

  async function handleSubmit(values: CustomerFormSubmitValues) {
    setFormError(null);
    try {
      await updateCustomer.mutateAsync({ id: customer.id, ...values });
      setIsEditOpen(false);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <DashboardLayout>
      <Link to="/customers" className="text-sm font-medium text-brand-700 hover:text-brand-800">
        ← Back to customers
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold text-stone-900">{customer.name}</h1>
        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setIsEditOpen(true);
          }}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
        >
          Edit
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Phone</dt>
            <dd className="mt-1 text-sm text-stone-900">{customer.phone}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Email</dt>
            <dd className="mt-1 text-sm text-stone-900">{customer.email ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Notes</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{customer.notes || "No notes yet."}</dd>
          </div>
        </dl>
      </div>

      {isEditOpen && (
        <CustomerFormModal
          customer={customer}
          isSubmitting={updateCustomer.isPending}
          serverError={formError}
          onSubmit={handleSubmit}
          onClose={() => setIsEditOpen(false)}
        />
      )}
    </DashboardLayout>
  );
}
