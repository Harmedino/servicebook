import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { DashboardSummaryResponse } from "@servicebook/types";
import { apiRequest } from "./apiClient";

export const DASHBOARD_QUERY_KEY = ["dashboard", "summary"] as const;

export function useDashboardSummary(): UseQueryResult<DashboardSummaryResponse> {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: () => apiRequest<DashboardSummaryResponse>("/api/dashboard/summary"),
  });
}
