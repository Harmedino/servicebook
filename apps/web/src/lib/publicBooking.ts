import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import type {
  AvailableSlotsResponse,
  PublicBookingConfirmationResponse,
  PublicBookingCustomerInput,
  PublicBusinessResponse,
  PublicStaffListResponse,
} from "@servicebook/types";
import { apiRequest } from "./apiClient";

export interface CreatePublicBookingInput {
  serviceId: string;
  staffId: string;
  startTime: string;
  customer: PublicBookingCustomerInput;
  notes?: string;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function usePublicBusiness(slug: string): UseQueryResult<PublicBusinessResponse> {
  return useQuery({
    queryKey: ["public", "business", slug],
    queryFn: () => apiRequest<PublicBusinessResponse>(`/api/public/businesses/${slug}`, { auth: false }),
    enabled: Boolean(slug),
    retry: false,
  });
}

export function usePublicStaff(slug: string, serviceId?: string): UseQueryResult<PublicStaffListResponse> {
  return useQuery({
    queryKey: ["public", "staff", slug, serviceId],
    queryFn: () =>
      apiRequest<PublicStaffListResponse>(
        `/api/public/businesses/${slug}/staff${buildQuery({ serviceId })}`,
        { auth: false },
      ),
    enabled: Boolean(slug && serviceId),
  });
}

export function usePublicAvailableSlots(
  slug: string,
  serviceId?: string,
  staffId?: string,
  date?: string,
): UseQueryResult<AvailableSlotsResponse> {
  return useQuery({
    queryKey: ["public", "slots", slug, serviceId, staffId, date],
    queryFn: () =>
      apiRequest<AvailableSlotsResponse>(
        `/api/public/businesses/${slug}/availability${buildQuery({ serviceId, staffId, date })}`,
        { auth: false },
      ),
    enabled: Boolean(slug && serviceId && staffId && date),
  });
}

export function useCreatePublicBooking(
  slug: string,
): UseMutationResult<PublicBookingConfirmationResponse, unknown, CreatePublicBookingInput> {
  return useMutation({
    mutationFn: (input: CreatePublicBookingInput) =>
      apiRequest<PublicBookingConfirmationResponse>(`/api/public/businesses/${slug}/bookings`, {
        method: "POST",
        body: input,
        auth: false,
      }),
  });
}
