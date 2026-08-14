import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import type {
  CustomerAppointmentFilter,
  CustomerListResponse,
  CustomerResponse,
  CustomerSort,
} from "@servicebook/types";
import { apiRequest } from "./apiClient";

export interface CustomerListParams {
  q?: string;
  page?: number;
  limit?: number;
  sort?: CustomerSort;
  filter?: CustomerAppointmentFilter;
}

function customersListQueryKey(params: CustomerListParams) {
  return ["customers", "list", params] as const;
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

export function useCustomers(params: CustomerListParams = {}): UseQueryResult<CustomerListResponse> {
  return useQuery({
    queryKey: customersListQueryKey(params),
    queryFn: () => {
      const search = new URLSearchParams();
      if (params.q) search.set("q", params.q);
      if (params.page) search.set("page", String(params.page));
      if (params.limit) search.set("limit", String(params.limit));
      if (params.sort) search.set("sort", params.sort);
      if (params.filter) search.set("filter", params.filter);
      const query = search.toString();
      return apiRequest<CustomerListResponse>(`/api/customers${query ? `?${query}` : ""}`);
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
