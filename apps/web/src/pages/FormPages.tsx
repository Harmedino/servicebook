import { useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "../components/DashboardLayout";
import { BackLink } from "../components/ui/BackLink";
import { CustomerForm, type CustomerFormSubmitValues } from "../components/CustomerForm";
import { ServiceForm, type ServiceFormSubmitValues } from "../components/ServiceForm";
import { StaffForm, type StaffFormSubmitValues } from "../components/StaffForm";
import { useCreateCustomer, useCustomer, useUpdateCustomer } from "../lib/customers";
import { useCreateService, useServices, useUpdateService } from "../lib/services";
import { useCreateStaff, useStaffList, useUpdateStaff } from "../lib/staff";
import { ApiError } from "../lib/apiClient";

const errorText = (error: unknown) => (error instanceof ApiError ? error.message : "Something went wrong. Please try again.");

/** Shared frame for add/edit pages: back link, title, then the form in a card. */
export function FormPage({
  backTo,
  backLabel,
  title,
  description,
  children,
}: {
  backTo: string;
  backLabel: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <BackLink to={backTo} label={backLabel} />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
        <div className="mt-5 rounded-3xl border border-stone-200 bg-surface p-5 sm:p-7">{children}</div>
      </div>
    </DashboardLayout>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton-shimmer h-12 rounded-xl bg-stone-100" />
      ))}
    </div>
  );
}

/**
 * After cancelling or editing: back to where the page was opened from.
 * After adding: to the new record's page (its back link still leads to the list).
 */
function useReturnTo(fallback: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  return (target?: string, created = false) =>
    navigate(created && target ? target : (from ?? target ?? fallback), { replace: true, state: created ? { from } : undefined });
}

// ---- Customers -------------------------------------------------------------------

export function CustomerFormPage() {
  const { customerId } = useParams();
  const isEdit = Boolean(customerId);
  const { data, isPending } = useCustomer(customerId ?? "");
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const [error, setError] = useState<string | null>(null);
  const done = useReturnTo(isEdit ? `/customers/${customerId}` : "/customers");

  async function handleSubmit(values: CustomerFormSubmitValues) {
    setError(null);
    try {
      if (customerId) {
        await update.mutateAsync({ id: customerId, ...values });
        done(`/customers/${customerId}`);
      } else {
        const result = await create.mutateAsync(values);
        done(`/customers/${result.customer.id}`, true);
      }
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <FormPage
      backTo={isEdit ? `/customers/${customerId}` : "/customers"}
      backLabel={isEdit ? "Customer" : "Customers"}
      title={isEdit ? "Edit customer" : "Add a customer"}
      description={isEdit ? undefined : "Save someone who called, walked in or messaged you. Customers who book online are added for you."}
    >
      {isEdit && isPending ? (
        <FormSkeleton />
      ) : (
        <CustomerForm
          customer={data?.customer ?? null}
          isSubmitting={create.isPending || update.isPending}
          serverError={error}
          onSubmit={handleSubmit}
          onCancel={() => done()}
        />
      )}
    </FormPage>
  );
}

// ---- Services --------------------------------------------------------------------

export function ServiceFormPage() {
  const { serviceId } = useParams();
  const isEdit = Boolean(serviceId);
  const { data: servicesData, isPending } = useServices();
  const { data: staffData } = useStaffList();
  const create = useCreateService();
  const update = useUpdateService();
  const [error, setError] = useState<string | null>(null);
  const done = useReturnTo(isEdit ? `/services/${serviceId}` : "/services");
  const service = servicesData?.services.find((entry) => entry.id === serviceId) ?? null;

  async function handleSubmit(values: ServiceFormSubmitValues) {
    setError(null);
    try {
      if (serviceId) {
        await update.mutateAsync({ id: serviceId, ...values });
        done(`/services/${serviceId}`);
      } else {
        const result = await create.mutateAsync(values);
        done(`/services/${result.service.id}`, true);
      }
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <FormPage
      backTo={isEdit ? `/services/${serviceId}` : "/services"}
      backLabel={isEdit ? "Service" : "Services"}
      title={isEdit ? "Edit service" : "Add a service"}
      description={isEdit ? undefined : "Give it a price and how long it takes. Customers see it on your booking page."}
    >
      {isPending || (isEdit && !service) ? (
        isPending ? <FormSkeleton /> : <p className="text-sm text-stone-500">This service doesn&apos;t exist anymore.</p>
      ) : (
        <ServiceForm
          service={service}
          availableStaff={staffData?.staff ?? []}
          isSubmitting={create.isPending || update.isPending}
          serverError={error}
          onSubmit={handleSubmit}
          onCancel={() => done()}
        />
      )}
    </FormPage>
  );
}

// ---- Staff -----------------------------------------------------------------------

export function StaffFormPage() {
  const { staffId } = useParams();
  const isEdit = Boolean(staffId);
  const { data: staffData, isPending } = useStaffList();
  const { data: servicesData } = useServices();
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const [error, setError] = useState<string | null>(null);
  const done = useReturnTo(isEdit ? `/staff/${staffId}` : "/staff");
  const staff = staffData?.staff.find((entry) => entry.id === staffId) ?? null;
  // Active services, plus inactive ones they already do, so saving never silently drops one.
  const assignable = (servicesData?.services ?? []).filter((service) => service.isActive || (staff?.serviceIds.includes(service.id) ?? false));

  async function handleSubmit(values: StaffFormSubmitValues) {
    setError(null);
    try {
      if (staffId) {
        await update.mutateAsync({ id: staffId, ...values });
        done(`/staff/${staffId}`);
      } else {
        const result = await create.mutateAsync(values);
        done(`/staff/${result.staff.id}`, true);
      }
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <FormPage
      backTo={isEdit ? `/staff/${staffId}` : "/staff"}
      backLabel={isEdit ? "Staff member" : "Staff"}
      title={isEdit ? "Edit staff member" : "Add a staff member"}
      description={isEdit ? undefined : "Add the services they do. You can set their working hours on their page afterwards."}
    >
      {isPending || (isEdit && !staff) ? (
        isPending ? <FormSkeleton /> : <p className="text-sm text-stone-500">This staff member doesn&apos;t exist anymore.</p>
      ) : (
        <StaffForm
          staff={staff}
          availableServices={assignable}
          isSubmitting={create.isPending || update.isPending}
          serverError={error}
          onSubmit={handleSubmit}
          onCancel={() => done()}
        />
      )}
    </FormPage>
  );
}
