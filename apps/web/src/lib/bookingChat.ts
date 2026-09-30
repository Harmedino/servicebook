import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import type {
  BookingMessagesResponse,
  ChatMessageResponse,
  ConversationListResponse,
  PublicBookingThreadResponse,
} from "@servicebook/types";
import { apiRequest } from "./apiClient";

// Replies arrive while a chat is open; poll quickly then, slowly otherwise.
const OPEN_THREAD_POLL_MS = 5_000;

// ---- Customer side ------------------------------------------------------------

export function usePublicThread(token: string): UseQueryResult<PublicBookingThreadResponse> {
  return useQuery({
    queryKey: ["public-thread", token],
    queryFn: () => apiRequest<PublicBookingThreadResponse>(`/api/public/bookings/${token}`, { auth: false }),
    enabled: Boolean(token),
    retry: false,
    refetchInterval: OPEN_THREAD_POLL_MS,
  });
}

export function useSendPublicMessage(token: string): UseMutationResult<ChatMessageResponse, unknown, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => apiRequest<ChatMessageResponse>(`/api/public/bookings/${token}/messages`, { method: "POST", body: { body }, auth: false }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["public-thread", token] }),
  });
}

export function useCancelPublicBooking(token: string): UseMutationResult<{ status: string }, unknown, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<{ status: string }>(`/api/public/bookings/${token}/cancel`, { method: "POST", auth: false }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["public-thread", token] }),
  });
}

// ---- Business side ------------------------------------------------------------

const CONVERSATIONS_KEY = ["conversations"] as const;

export function useConversations(): UseQueryResult<ConversationListResponse> {
  return useQuery({
    queryKey: CONVERSATIONS_KEY,
    queryFn: () => apiRequest<ConversationListResponse>("/api/conversations"),
    refetchInterval: 30_000,
  });
}

export function useBookingMessages(bookingId: string | null): UseQueryResult<BookingMessagesResponse> {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["booking-messages", bookingId],
    queryFn: async () => {
      const data = await apiRequest<BookingMessagesResponse>(`/api/bookings/${bookingId}/messages`);
      // Opening a chat marks it read; refresh the unread badges.
      void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      return data;
    },
    enabled: Boolean(bookingId),
    refetchInterval: OPEN_THREAD_POLL_MS,
  });
}

export function useSendBookingMessage(bookingId: string): UseMutationResult<ChatMessageResponse, unknown, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => apiRequest<ChatMessageResponse>(`/api/bookings/${bookingId}/messages`, { method: "POST", body: { body } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["booking-messages", bookingId] });
      void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}
