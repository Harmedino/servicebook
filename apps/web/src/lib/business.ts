import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import type { BusinessResponse, MyBusinessResponse, SocialLinks } from "@servicebook/types";
import { apiRequest } from "./apiClient";
import { DASHBOARD_QUERY_KEY } from "./dashboard";

const BUSINESS_QUERY_KEY = ["business", "me"] as const;

export interface CreateBusinessInput {
  name: string;
  email?: string;
  phone?: string;
  description?: string;
  timezone?: string;
  currency?: string;
}

export interface UpdateBusinessInput {
  name?: string;
  email?: string;
  phone?: string;
  description?: string;
  address?: string;
  website?: string;
  socials?: SocialLinks;
  timezone?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  /** "" resets to the default colour. */
  brandColor?: string;
  currency?: string;
  isPublicBookingEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
  notifyCustomerOnBooking?: boolean;
  notifyCustomerReminder?: boolean;
  notifyOwnerOnBooking?: boolean;
}

export function useMyBusiness(): UseQueryResult<MyBusinessResponse> {
  return useQuery({
    queryKey: BUSINESS_QUERY_KEY,
    queryFn: () => apiRequest<MyBusinessResponse>("/api/business"),
  });
}

export function useCreateBusiness(): UseMutationResult<BusinessResponse, unknown, CreateBusinessInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBusinessInput) =>
      apiRequest<BusinessResponse>("/api/business", { method: "POST", body: input }),
    onSuccess: (data) => {
      queryClient.setQueryData<MyBusinessResponse>(BUSINESS_QUERY_KEY, { business: data.business });
    },
  });
}

export function useUpdateBusiness(): UseMutationResult<BusinessResponse, unknown, UpdateBusinessInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBusinessInput) =>
      apiRequest<BusinessResponse>("/api/business", { method: "PATCH", body: input }),
    onSuccess: (data) => {
      queryClient.setQueryData<MyBusinessResponse>(BUSINESS_QUERY_KEY, { business: data.business });
      // Name/timezone/public-booking-enabled all surface on the dashboard summary too.
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    },
  });
}
