import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import type { BusinessHoursEntry, BusinessHoursResponse } from "@servicebook/types";
import { apiRequest } from "./apiClient";

const BUSINESS_HOURS_QUERY_KEY = ["business", "hours"] as const;

export function useBusinessHours(): UseQueryResult<BusinessHoursResponse> {
  return useQuery({
    queryKey: BUSINESS_HOURS_QUERY_KEY,
    queryFn: () => apiRequest<BusinessHoursResponse>("/api/business/hours"),
  });
}

export function useUpdateBusinessHours(): UseMutationResult<BusinessHoursResponse, unknown, BusinessHoursEntry[]> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (hours: BusinessHoursEntry[]) =>
      apiRequest<BusinessHoursResponse>("/api/business/hours", { method: "PUT", body: { hours } }),
    onSuccess: (data) => {
      queryClient.setQueryData(BUSINESS_HOURS_QUERY_KEY, data);
    },
  });
}
