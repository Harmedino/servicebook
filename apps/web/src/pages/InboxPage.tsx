import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { CalendarPlus, Inbox, MessageCircle, Phone, Settings2, UserRound } from "lucide-react";
import type { EnquiryProfile, EnquiryStatus } from "@servicebook/types";
import { DashboardLayout } from "../components/DashboardLayout";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { CardListSkeleton } from "../components/ui/Skeleton";
import { SocialIcon } from "../components/SocialIcon";
import { buttonClassName } from "../components/ui/Button";
import { useEnquiries, useUpdateEnquiry, type EnquiryFilter } from "../lib/enquiries";
import { useMyBusiness } from "../lib/business";
import { activeChannels, CHANNEL_BY_ID, whatsappNumberFor } from "../lib/socials";

const FILTERS: { value: EnquiryFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "booked", label: "Booked" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

const STATUS_STYLES: Record<EnquiryStatus, string> = {
  new: "bg-brand-600 text-white",
  contacted: "bg-sky-50 text-sky-700",
  booked: "bg-emerald-50 text-emerald-700",
  closed: "bg-stone-100 text-stone-500",
};

const NEXT_ACTIONS: Record<EnquiryStatus, { status: EnquiryStatus; label: string }[]> = {
  new: [
    { status: "contacted", label: "Mark replied" },
    { status: "booked", label: "Booked" },
    { status: "closed", label: "Close" },
  ],
  contacted: [
    { status: "booked", label: "Booked" },
    { status: "closed", label: "Close" },
  ],
  booked: [{ status: "new", label: "Reopen" }],
  closed: [{ status: "new", label: "Reopen" }],
};

function EnquiryCard({ enquiry, businessWhatsapp }: { enquiry: EnquiryProfile; businessWhatsapp?: string }) {
  const update = useUpdateEnquiry();
  const channel = CHANNEL_BY_ID[enquiry.channel];
  const customerWhatsapp = whatsappNumberFor(enquiry.phone, businessWhatsapp);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={`rounded-2xl border bg-surface p-4 sm:p-5 ${enquiry.status === "new" ? "border-brand-300" : "border-stone-200"}`}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: channel.color, color: channel.onColor }}
          title={`Started on ${channel.label}`}
        >
          <SocialIcon icon={channel.icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link to={`/customers/${enquiry.customerId}`} className="truncate font-semibold text-stone-900 hover:text-brand-700">
              {enquiry.name}
            </Link>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[enquiry.status]}`}>{enquiry.status}</span>
            <span className="ml-auto shrink-0 text-xs text-stone-400">{formatDistanceToNowStrict(new Date(enquiry.createdAt), { addSuffix: true })}</span>
          </div>
          <p className="mt-0.5 text-sm text-stone-500">
            <span className="font-mono text-xs font-semibold text-stone-700">{enquiry.reference}</span> · via {channel.label} · {enquiry.phone}
          </p>
          {enquiry.serviceName && (
            <p className="mt-2 inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">{enquiry.serviceName}</p>
          )}
          {enquiry.message && <p className="mt-2 whitespace-pre-line text-sm text-stone-700">&ldquo;{enquiry.message}&rdquo;</p>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3 sm:pl-[3.25rem]">
        <a
          href={`https://wa.me/${customerWhatsapp}?text=${encodeURIComponent(`Hi ${enquiry.name.split(" ")[0]}, thanks for reaching out (Ref ${enquiry.reference}).`)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-xs font-semibold text-white hover:brightness-95"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> WhatsApp
        </a>
        <a href={`tel:${enquiry.phone.replace(/\s/g, "")}`} className={buttonClassName("secondary", "sm")}>
          <Phone className="h-3.5 w-3.5" aria-hidden="true" /> Call
        </a>
        <Link to="/bookings?new=1" className={buttonClassName("secondary", "sm")}>
          <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" /> Book
        </Link>
        <div className="ml-auto flex gap-1.5">
          {NEXT_ACTIONS[enquiry.status].map((action) => (
            <button
              key={action.status}
              type="button"
              disabled={update.isPending}
              onClick={() => update.mutate({ id: enquiry.id, status: action.status })}
              className="h-8 rounded-lg px-2.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-100 disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </motion.li>
  );
}

export function InboxPage() {
  const [filter, setFilter] = useState<EnquiryFilter>("open");
  const { data, isPending, isError } = useEnquiries(filter);
  const { data: businessData } = useMyBusiness();
  const business = businessData?.business ?? undefined;
  const channels = activeChannels(business?.socials);
  const counts = data?.counts;
  const enquiries = data?.enquiries ?? [];

  const countFor = (value: EnquiryFilter): number | undefined => {
    if (!counts) return undefined;
    if (value === "open") return counts.new + counts.contacted;
    if (value === "all") return counts.new + counts.contacted + counts.booked + counts.closed;
    return counts[value];
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Inbox"
        description="Chats customers started from your booking page. Each one has a reference they quote in their message."
        actions={
          <Link to="/settings?tab=chat" className={buttonClassName("secondary", "md")}>
            <Settings2 className="h-4 w-4" aria-hidden="true" /> Chat apps
          </Link>
        }
      />

      {business && channels.length <= 1 && (
        <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-ink p-4 text-white sm:flex-row sm:items-center sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Add Instagram, TikTok and your other apps</p>
            <p className="mt-0.5 text-sm text-white/60">Customers pick the app they use; you still get their details here first.</p>
          </div>
          <Link to="/settings?tab=chat" className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-highlight px-4 text-sm font-semibold text-ink">
            Set up chat apps
          </Link>
        </div>
      )}

      <div className="no-scrollbar mt-5 flex gap-1.5 overflow-x-auto">
        {FILTERS.map((option) => {
          const count = countFor(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                filter === option.value ? "bg-ink text-white dark:bg-brand-700" : "bg-surface text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100"
              }`}
            >
              {option.label}
              {count !== undefined && count > 0 && (
                <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${filter === option.value ? "bg-white/20" : "bg-stone-100"}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {isPending && <CardListSkeleton />}
        {isError && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Couldn&apos;t load your inbox. Please refresh.</p>}
        {!isPending && !isError && enquiries.length === 0 && (
          <EmptyState
            icon={filter === "open" ? Inbox : UserRound}
            title={filter === "open" ? "You're all caught up" : "Nothing here"}
            description="When a customer taps “Chat with us” on your booking page, their details and question appear here before they message you."
            action={
              business && (
                <a href={`/book/${business.slug}`} target="_blank" rel="noreferrer" className={buttonClassName("secondary", "md")}>
                  See your booking page
                </a>
              )
            }
          />
        )}
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {enquiries.map((enquiry) => (
              <EnquiryCard key={enquiry.id} enquiry={enquiry} businessWhatsapp={business?.socials?.whatsapp} />
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </DashboardLayout>
  );
}
