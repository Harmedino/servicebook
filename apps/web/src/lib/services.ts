import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import type { ServiceListResponse, ServiceResponse } from "@servicebook/types";
import { apiRequest } from "./apiClient";

const SERVICES_QUERY_KEY = ["services"] as const;

export interface CreateServiceInput {
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  isActive?: boolean;
}

export interface UpdateServiceInput {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  durationMinutes?: number;
  isActive?: boolean;
}

export function useServices(): UseQueryResult<ServiceListResponse> {
  return useQuery({
    queryKey: SERVICES_QUERY_KEY,
    queryFn: () => apiRequest<ServiceListResponse>("/api/services"),
  });
}

export function useCreateService(): UseMutationResult<ServiceResponse, unknown, CreateServiceInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateServiceInput) =>
      apiRequest<ServiceResponse>("/api/services", { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
    },
  });
}

export function useUpdateService(): UseMutationResult<ServiceResponse, unknown, UpdateServiceInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateServiceInput) =>
      apiRequest<ServiceResponse>(`/api/services/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
    },
  });
}

export function useDeactivateService(): UseMutationResult<ServiceResponse, unknown, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<ServiceResponse>(`/api/services/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
    },
  });
}
