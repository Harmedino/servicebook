import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { CustomerPortalLinkResponse, CustomerPortalResponse } from "@servicebook/types";
import { apiRequest } from "./apiClient";

/** The customer's own page: their appointments here and their saved details. */
export function useCustomerPortal(token: string | null | undefined): UseQueryResult<CustomerPortalResponse> {
  return useQuery({
    queryKey: ["customer-portal", token],
    queryFn: () => apiRequest<CustomerPortalResponse>(`/api/public/customers/${token}`, { auth: false }),
    enabled: Boolean(token),
    retry: false,
    staleTime: 30_000,
  });
}

/** For the owner: the link to send a customer so they can see their appointments and rebook. */
export function useCustomerPortalLink(customerId: string): UseQueryResult<CustomerPortalLinkResponse> {
  return useQuery({
    queryKey: ["customers", "portal-link", customerId],
    queryFn: () => apiRequest<CustomerPortalLinkResponse>(`/api/customers/${customerId}/portal-link`),
    enabled: Boolean(customerId),
    staleTime: Infinity,
  });
}

export const customerPageUrl = (token: string) => `${window.location.origin}/c/${token}`;

/** /book/:slug pre-filled for this customer, optionally with a service and person picked. */
export function rebookPath(slug: string, token: string, pick?: { serviceId?: string; staffId?: string }): string {
  const params = new URLSearchParams({ c: token });
  if (pick?.serviceId) params.set("service", pick.serviceId);
  if (pick?.staffId) params.set("staff", pick.staffId);
  return `/book/${slug}?${params.toString()}`;
}

// The customer's own page token, remembered per business on this device, so
// opening the booking link again shows their appointments. Storage can be
// blocked (private mode), so every access is guarded.
const rememberKey = (slug: string) => `servicebook:customer:${slug}`;

export function rememberedCustomer(slug: string): string | null {
  try {
    return localStorage.getItem(rememberKey(slug));
  } catch {
    return null;
  }
}

export function rememberCustomer(slug: string, token: string): void {
  try {
    localStorage.setItem(rememberKey(slug), token);
  } catch {
    // Not remembered; they can still use their link.
  }
}

export function forgetCustomer(slug: string): void {
  try {
    localStorage.removeItem(rememberKey(slug));
  } catch {
    // Nothing to forget.
  }
}
