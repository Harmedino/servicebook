import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import type { StaffAvailabilityEntry, StaffAvailabilityResponse } from "@servicebook/types";
import { apiRequest } from "./apiClient";

function availabilityQueryKey(staffId: string) {
  return ["staff", staffId, "availability"] as const;
}

export function useStaffAvailability(staffId: string): UseQueryResult<StaffAvailabilityResponse> {
  return useQuery({
    queryKey: availabilityQueryKey(staffId),
    queryFn: () => apiRequest<StaffAvailabilityResponse>(`/api/staff/${staffId}/availability`),
    enabled: Boolean(staffId),
  });
}

export function useUpdateStaffAvailability(
  staffId: string,
): UseMutationResult<StaffAvailabilityResponse, unknown, StaffAvailabilityEntry[]> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (availability: StaffAvailabilityEntry[]) =>
      apiRequest<StaffAvailabilityResponse>(`/api/staff/${staffId}/availability`, {
        method: "PUT",
        body: { availability },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(availabilityQueryKey(staffId), data);
    },
  });
}
