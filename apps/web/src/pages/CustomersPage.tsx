import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import { ChevronRight, Link2, MessageCircle, Plus, Share2 } from "lucide-react";
import type { CustomerAppointmentFilter, CustomerSort } from "@servicebook/types";
import { useCustomers } from "../lib/customers";
import { useMyBusiness } from "../lib/business";
import { DashboardLayout } from "../components/DashboardLayout";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { CardListSkeleton } from "../components/ui/Skeleton";
import { Avatar } from "../components/ui/Avatar";
import { InviteCustomersModal } from "../components/InviteCustomersModal";

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
  const [searchParams] = useSearchParams();
  const [sort, setSort] = useState<CustomerSort>(() => (SORT_OPTIONS.some((option) => option.value === searchParams.get("sort")) ? (searchParams.get("sort") as CustomerSort) : "recent"));
  const [filter, setFilter] = useState<CustomerAppointmentFilter>("all");
  const [page, setPage] = useState(1);

  const { data: businessData } = useMyBusiness();
  const business = businessData?.business ?? undefined;
  const timezone = business?.timezone ?? "UTC";
  const [isInviteOpen, setIsInviteOpen] = useState(false);

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


  const customers = data?.customers ?? [];
  const pagination = data?.pagination;
  const isSearching = debouncedSearch.length > 0;
  const hasActiveFilters = isSearching || filter !== "all";

  const navigate = useNavigate();

  function openAddModal() {
    navigate("/customers/new", { state: { from: "/customers" } });
  }

  function openEditModal(customer: { id: string }) {
    navigate(`/customers/${customer.id}/edit`, { state: { from: "/customers" } });
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
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsInviteOpen(true)} disabled={!business}>
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Invite
            </Button>
            <Button onClick={openAddModal}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add customer
            </Button>
          </div>
        }
      />

      {business && (
        <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-ink p-4 text-white sm:flex-row sm:items-center sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Let customers add themselves</p>
            <p className="mt-0.5 text-sm text-white/60">
              Send your join link on WhatsApp or print its QR code. New sign-ups appear here with a &ldquo;Joined via link&rdquo; tag.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-highlight px-4 text-sm font-semibold text-ink transition hover:bg-highlight-soft"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" /> Share join link
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search customers…"
          className="w-full rounded-lg border border-stone-300 bg-surface px-3 py-2 text-sm text-stone-900 sm:max-w-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
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
      </div>

      <div className="mt-6">

        {isPending && <CardListSkeleton />}

        {isError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Couldn&apos;t load customers. Please refresh the page.
          </p>
        )}

        {!isPending && !isError && customers.length === 0 && !hasActiveFilters && (
          <EmptyState
            title="No customers yet"
            description="Share your join link and customers add themselves, or add someone by hand. Anyone who books online appears here too."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => setIsInviteOpen(true)} disabled={!business}>
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  Share join link
                </Button>
                <Button variant="secondary" onClick={openAddModal}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add customer
                </Button>
              </div>
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
                        {(customer.source === "link" || customer.source === "chat") && <JoinedBadge source={customer.source} />}
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

            <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-surface md:hidden">
              {customers.map((customer) => (
                <li key={customer.id}>
                  <Link to={`/customers/${customer.id}`} className="flex items-center gap-3 px-3.5 py-3 active:bg-stone-50">
                    <Avatar name={customer.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-medium text-stone-900">
                        <span className="truncate">{customer.name}</span>
                        {(customer.source === "link" || customer.source === "chat") && <JoinedBadge source={customer.source} />}
                      </p>
                      <p className="truncate text-sm text-stone-500">{customer.phone}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-stone-900">{customer.appointmentCount ?? 0}</p>
                      <p className="text-[11px] text-stone-400">visits</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" aria-hidden="true" />
                  </Link>
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

      {isInviteOpen && business && (
        <InviteCustomersModal slug={business.slug} businessName={business.name} onClose={() => setIsInviteOpen(false)} />
      )}

    </DashboardLayout>
  );
}

function JoinedBadge({ source }: { source: "link" | "chat" }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
      {source === "link" ? <Link2 className="h-3 w-3" aria-hidden="true" /> : <MessageCircle className="h-3 w-3" aria-hidden="true" />}
      {source === "link" ? "Joined via link" : "From chat"}
    </span>
  );
}
