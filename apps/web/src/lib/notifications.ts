import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { NotificationListResponse } from "@servicebook/types";
import { apiRequest } from "./apiClient";

const KEY = ["notifications"] as const;

/** Polled while the dashboard is open, so new bookings and messages show up within seconds. */
export function useNotifications(): UseQueryResult<NotificationListResponse> {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiRequest<NotificationListResponse>("/api/notifications"),
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<{ unread: number }>(`/api/notifications/${id}/read`, { method: "POST" }),
    onMutate: (id) =>
      queryClient.setQueryData<NotificationListResponse>(KEY, (current) =>
        current
          ? {
              unread: Math.max(0, current.unread - (current.notifications.find((n) => n.id === id && !n.read) ? 1 : 0)),
              notifications: current.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
            }
          : current,
      ),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<{ unread: number }>("/api/notifications/read-all", { method: "POST" }),
    onMutate: () =>
      queryClient.setQueryData<NotificationListResponse>(KEY, (current) =>
        current ? { unread: 0, notifications: current.notifications.map((n) => ({ ...n, read: true })) } : current,
      ),
  });
}
