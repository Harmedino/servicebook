import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import type { StaffListResponse, StaffResponse } from "@servicebook/types";
import { apiRequest } from "./apiClient";
import { DASHBOARD_QUERY_KEY } from "./dashboard";

const STAFF_QUERY_KEY = ["staff"] as const;

export interface CreateStaffInput {
  name: string;
  email?: string;
  phone?: string;
  serviceIds?: string[];
  isActive?: boolean;
}

export interface UpdateStaffInput {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  serviceIds?: string[];
  isActive?: boolean;
}

export function useStaffList(): UseQueryResult<StaffListResponse> {
  return useQuery({
    queryKey: STAFF_QUERY_KEY,
    queryFn: () => apiRequest<StaffListResponse>("/api/staff"),
  });
}

export function useCreateStaff(): UseMutationResult<StaffResponse, unknown, CreateStaffInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStaffInput) => apiRequest<StaffResponse>("/api/staff", { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    },
  });
}

// Also used to deactivate/reactivate staff — there's no separate delete
// endpoint, PATCH with { isActive: false } is the deactivation mechanism.
export function useUpdateStaff(): UseMutationResult<StaffResponse, unknown, UpdateStaffInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateStaffInput) =>
      apiRequest<StaffResponse>(`/api/staff/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    },
  });
}
