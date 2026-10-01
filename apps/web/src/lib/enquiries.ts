import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import type { EnquiryListResponse, EnquiryResponse, EnquiryStatus } from "@servicebook/types";
import { apiRequest } from "./apiClient";

export type EnquiryFilter = EnquiryStatus | "open" | "all";

const ENQUIRIES_QUERY_KEY = ["enquiries"] as const;

export function useEnquiries(status: EnquiryFilter = "open", options?: { enabled?: boolean }): UseQueryResult<EnquiryListResponse> {
  return useQuery({
    queryKey: [...ENQUIRIES_QUERY_KEY, status],
    queryFn: () => apiRequest<EnquiryListResponse>(`/api/enquiries?status=${status}`),
    enabled: options?.enabled ?? true,
    // New chats arrive while the owner has the app open.
    refetchInterval: 60_000,
  });
}

export function useUpdateEnquiry(): UseMutationResult<EnquiryResponse, unknown, { id: string; status: EnquiryStatus }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => apiRequest<EnquiryResponse>(`/api/enquiries/${id}`, { method: "PATCH", body: { status } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ENQUIRIES_QUERY_KEY }),
  });
}
