import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { useCreateCustomer, useCustomers } from "../lib/customers";
import { useServices } from "../lib/services";
import { useStaffList } from "../lib/staff";
import { useAvailableSlots } from "../lib/bookings";
import { useMyBusiness } from "../lib/business";
import { useEscapeToClose } from "../lib/useEscapeToClose";
import { ApiError } from "../lib/apiClient";
import { CustomerFormModal, type CustomerFormSubmitValues } from "./CustomerFormModal";
import { Button } from "./ui/Button";

export interface BookingFormSubmitValues {
  customerId: string;
  serviceId: string;
  staffId: string;
  startTime: string;
  notes?: string;
}

interface BookingFormModalProps {
  isSubmitting: boolean;
  serverError: string | null;
  /** Pre-fills the date field — e.g. when opened by clicking an empty calendar slot. */
  initialDate?: string;
  /** Pre-fills the customer field — e.g. when opened from a customer's detail page. */
  initialCustomerId?: string;
  onSubmit: (values: BookingFormSubmitValues) => void;
  onClose: () => void;
}

const selectClassName =
  "mt-1 w-full rounded-lg border border-stone-300 bg-surface px-3 py-2 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:bg-stone-100";

export function BookingFormModal({
  isSubmitting,
  serverError,
  initialDate,
  initialCustomerId,
  onSubmit,
  onClose,
}: BookingFormModalProps) {
  useEscapeToClose(onClose);

  const { data: businessData } = useMyBusiness();
  const timezone = businessData?.business?.timezone ?? "UTC";

  // limit=200: this dropdown lists every customer, not a paginated page —
  // the highest limit the endpoint allows is a pragmatic ceiling for now.
  const { data: customersData } = useCustomers({ limit: 200 });
  const { data: servicesData } = useServices();
  const { data: staffData } = useStaffList();
  const createCustomer = useCreateCustomer();

  const customers = customersData?.customers ?? [];
  const activeServices = (servicesData?.services ?? []).filter((service) => service.isActive);
  const allStaff = staffData?.staff ?? [];

  const [customerId, setCustomerId] = useState(initialCustomerId ?? "");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(initialDate ?? "");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [newCustomerError, setNewCustomerError] = useState<string | null>(null);

  const eligibleStaff = allStaff.filter((staff) => staff.isActive && Boolean(serviceId) && staff.serviceIds.includes(serviceId));

  const today = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");

  const { data: slotsData, isFetching: isLoadingSlots } = useAvailableSlots(
    serviceId || undefined,
    staffId || undefined,
    date || undefined,
  );
  const slots = slotsData?.slots ?? [];

  // Progressive filtering: each upstream selection resets what depends on it.
  // Skips the very first run so an initialDate pre-fill survives mount.
  const isFirstServiceEffect = useRef(true);
  useEffect(() => {
    if (isFirstServiceEffect.current) {
      isFirstServiceEffect.current = false;
      return;
    }
    setStaffId("");
    setDate("");
    setSelectedSlot(null);
  }, [serviceId]);

  useEffect(() => {
    setSelectedSlot(null);
  }, [staffId, date]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFieldError(null);

    if (!customerId) {
      setFieldError("Select a customer");
      return;
    }
    if (!serviceId) {
      setFieldError("Select a service");
      return;
    }
    if (!staffId) {
      setFieldError("Select a staff member");
      return;
    }
    if (!selectedSlot) {
      setFieldError("Select an available time");
      return;
    }

    onSubmit({ customerId, serviceId, staffId, startTime: selectedSlot, notes: notes.trim() || undefined });
  }

  async function handleCreateCustomer(values: CustomerFormSubmitValues) {
    setNewCustomerError(null);
    try {
      const result = await createCustomer.mutateAsync(values);
      setCustomerId(result.customer.id);
      setIsNewCustomerOpen(false);
    } catch (error) {
      setNewCustomerError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-8">
      <div className="animate-fade-in-up w-full max-w-lg rounded-xl border border-stone-200 bg-surface p-6 shadow-[var(--shadow-elevated)]">
        <h2 className="text-lg font-semibold text-stone-900">New booking</h2>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          <label className="block">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-stone-700">Customer</span>
              <button
                type="button"
                onClick={() => setIsNewCustomerOpen(true)}
                disabled={isSubmitting}
                className="text-xs font-medium text-brand-700 hover:text-brand-800 disabled:cursor-not-allowed"
              >
                + New customer
              </button>
            </div>
            <select
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              disabled={isSubmitting}
              className={selectClassName}
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">Service</span>
            <select
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
              disabled={isSubmitting}
              className={selectClassName}
            >
              <option value="">Select service</option>
              {activeServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.durationMinutes} min)
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">Staff</span>
            <select
              value={staffId}
              onChange={(event) => setStaffId(event.target.value)}
              disabled={isSubmitting || !serviceId}
              className={selectClassName}
            >
              <option value="">{serviceId ? "Select staff" : "Select a service first"}</option>
              {eligibleStaff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                </option>
              ))}
            </select>
            {serviceId && eligibleStaff.length === 0 && (
              <p className="mt-1 text-xs text-stone-500">No staff currently provide this service.</p>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">Date</span>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(event) => setDate(event.target.value)}
              disabled={isSubmitting || !staffId}
              className={selectClassName}
            />
          </label>

          {staffId && date && (
            <div>
              <span className="text-sm font-medium text-stone-700">Time</span>
              {isLoadingSlots ? (
                <p className="mt-2 text-sm text-stone-500">Loading available times…</p>
              ) : slots.length === 0 ? (
                <div className="mt-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3 text-sm">
                  <p className="font-medium text-stone-700">No available times</p>
                  <p className="mt-0.5 text-stone-500">
                    This staff member has no available appointments for the selected date.
                  </p>
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      disabled={isSubmitting}
                      className={`rounded-lg border px-2 py-1.5 text-sm transition-colors disabled:cursor-not-allowed ${
                        selectedSlot === slot
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-stone-300 text-stone-700 hover:border-brand-400"
                      }`}
                    >
                      {formatInTimeZone(new Date(slot), timezone, "h:mm a")}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <label className="block">
            <span className="text-sm font-medium text-stone-700">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isSubmitting}
              rows={2}
              className={selectClassName}
            />
          </label>

          {(fieldError || serverError) && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {fieldError ?? serverError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create booking"}
            </Button>
          </div>
        </form>
      </div>

      {isNewCustomerOpen && (
        <CustomerFormModal
          customer={null}
          isSubmitting={createCustomer.isPending}
          serverError={newCustomerError}
          onSubmit={handleCreateCustomer}
          onClose={() => {
            setIsNewCustomerOpen(false);
            setNewCustomerError(null);
          }}
        />
      )}
    </div>
  );
}
