import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import type { AvailableSlotsResponse, BookingListResponse, BookingResponse, BookingStatus } from "@servicebook/types";
import { apiRequest } from "./apiClient";
import { DASHBOARD_QUERY_KEY } from "./dashboard";

export interface BookingFilters {
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: BookingStatus;
  staffId?: string;
  customerId?: string;
  serviceId?: string;
  /** Search by customer name, phone, or email — resolved server-side. */
  q?: string;
}

export interface CreateBookingInput {
  customerId: string;
  serviceId: string;
  staffId: string;
  startTime: string;
  notes?: string;
}

export interface UpdateBookingInput {
  id: string;
  status?: BookingStatus;
  notes?: string;
  staffId?: string;
  serviceId?: string;
  startTime?: string;
}

function buildQueryString(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function useBookings(filters?: BookingFilters): UseQueryResult<BookingListResponse> {
  return useQuery({
    queryKey: ["bookings", "list", filters ?? {}],
    queryFn: () => apiRequest<BookingListResponse>(`/api/bookings${buildQueryString({ ...filters })}`),
  });
}

export function useAvailableSlots(
  serviceId?: string,
  staffId?: string,
  date?: string,
): UseQueryResult<AvailableSlotsResponse> {
  return useQuery({
    queryKey: ["bookings", "available-slots", serviceId, staffId, date],
    queryFn: () =>
      apiRequest<AvailableSlotsResponse>(`/api/bookings/available-slots${buildQueryString({ serviceId, staffId, date })}`),
    enabled: Boolean(serviceId && staffId && date),
  });
}

export function useCreateBooking(): UseMutationResult<BookingResponse, unknown, CreateBookingInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingInput) =>
      apiRequest<BookingResponse>("/api/bookings", { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    },
  });
}

export function useUpdateBooking(): UseMutationResult<BookingResponse, unknown, UpdateBookingInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateBookingInput) =>
      apiRequest<BookingResponse>(`/api/bookings/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    },
  });
}

export function useBooking(id: string): UseQueryResult<BookingResponse> {
  return useQuery({
    queryKey: ["bookings", "detail", id],
    queryFn: () => apiRequest<BookingResponse>(`/api/bookings/${id}`),
    enabled: Boolean(id),
    retry: false,
  });
}

/** Opens a booking's page, remembering where you came from for its back button. */
export function useOpenBooking(): (id: string) => void {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(
    (id: string) => navigate(`/bookings/${id}`, { state: { from: `${location.pathname}${location.search}` } }),
    [navigate, location.pathname, location.search],
  );
}
