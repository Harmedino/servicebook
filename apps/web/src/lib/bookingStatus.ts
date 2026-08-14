import type { BookingStatus } from "@servicebook/types";

// Visual badge styling for these statuses now lives in components/ui/Badge.tsx
// (BookingStatusBadge) — this file keeps just the label text, still used by
// filter dropdowns.
export const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
};
