import type { ReactNode } from "react";
import type { BookingStatus } from "@servicebook/types";
import { STATUS_LABELS } from "../../lib/bookingStatus";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-stone-100 text-stone-600",
  success: "bg-green-50 text-green-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
  brand: "bg-brand-50 text-brand-700",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}

export function ActiveBadge({ isActive }: { isActive: boolean }) {
  return <Badge tone={isActive ? "success" : "neutral"}>{isActive ? "Active" : "Inactive"}</Badge>;
}

const BOOKING_STATUS_TONES: Record<BookingStatus, BadgeTone> = {
  PENDING: "warning",
  CONFIRMED: "success",
  CANCELLED: "neutral",
  COMPLETED: "info",
  NO_SHOW: "danger",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={BOOKING_STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}
