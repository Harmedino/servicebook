import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import type { CustomerListResponse, CustomerResponse } from "@servicebook/types";
import { apiRequest } from "./apiClient";

function customersListQueryKey(search?: string) {
  return ["customers", "list", search ?? ""] as const;
}

function customerDetailQueryKey(id: string) {
  return ["customers", "detail", id] as const;
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

export interface UpdateCustomerInput {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export function useCustomers(search?: string): UseQueryResult<CustomerListResponse> {
  return useQuery({
    queryKey: customersListQueryKey(search),
    queryFn: () => {
      const query = search ? `?q=${encodeURIComponent(search)}` : "";
      return apiRequest<CustomerListResponse>(`/api/customers${query}`);
    },
  });
}

export function useCustomer(id: string): UseQueryResult<CustomerResponse> {
  return useQuery({
    queryKey: customerDetailQueryKey(id),
    queryFn: () => apiRequest<CustomerResponse>(`/api/customers/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateCustomer(): UseMutationResult<CustomerResponse, unknown, CreateCustomerInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomerInput) =>
      apiRequest<CustomerResponse>("/api/customers", { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateCustomer(): UseMutationResult<CustomerResponse, unknown, UpdateCustomerInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateCustomerInput) =>
      apiRequest<CustomerResponse>(`/api/customers/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
