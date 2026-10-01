import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type {
  PublicShowcaseResponse,
  PublicStaffDetailResponse,
  ReviewListResponse,
  ReviewProfile,
  WorkPostListResponse,
  WorkPostProfile,
} from "@servicebook/types";
import { apiRequest } from "./apiClient";

// ---- Public (booking page) ----------------------------------------------------

export function usePublicShowcase(slug: string): UseQueryResult<PublicShowcaseResponse> {
  return useQuery({
    queryKey: ["public", "showcase", slug],
    queryFn: () => apiRequest<PublicShowcaseResponse>(`/api/public/businesses/${slug}/showcase`, { auth: false }),
    enabled: Boolean(slug),
    retry: false,
    staleTime: 60_000,
  });
}

export function usePublicStaffDetail(slug: string, staffId: string | null): UseQueryResult<PublicStaffDetailResponse> {
  return useQuery({
    queryKey: ["public", "staff-detail", slug, staffId],
    queryFn: () => apiRequest<PublicStaffDetailResponse>(`/api/public/businesses/${slug}/staff/${staffId}`, { auth: false }),
    enabled: Boolean(slug && staffId),
    retry: false,
    staleTime: 60_000,
  });
}

export function useSubmitReview(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { rating: number; comment?: string }) =>
      apiRequest<{ review: { rating: number; comment?: string } }>(`/api/public/bookings/${token}/review`, { method: "POST", body: input, auth: false }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["public-thread", token] }),
  });
}

// ---- Owner (dashboard) --------------------------------------------------------

const POSTS = ["showcase", "posts"] as const;
const REVIEWS = ["showcase", "reviews"] as const;

export interface WorkPostInput {
  imageUrl: string;
  title: string;
  caption?: string;
  staffId: string;
  serviceId?: string;
  featured?: boolean;
}

export function useWorkPosts(): UseQueryResult<WorkPostListResponse> {
  return useQuery({ queryKey: POSTS, queryFn: () => apiRequest<WorkPostListResponse>("/api/showcase") });
}

export function useSaveWorkPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<WorkPostInput> & { id?: string }) =>
      apiRequest<{ post: WorkPostProfile }>(id ? `/api/showcase/${id}` : "/api/showcase", { method: id ? "PATCH" : "POST", body: input }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: POSTS }),
  });
}

export function useDeleteWorkPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/api/showcase/${id}`, { method: "DELETE" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: POSTS }),
  });
}

export function useReviews(): UseQueryResult<ReviewListResponse> {
  return useQuery({ queryKey: REVIEWS, queryFn: () => apiRequest<ReviewListResponse>("/api/reviews") });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string; hidden?: boolean; reply?: string }) =>
      apiRequest<{ review: ReviewProfile }>(`/api/reviews/${id}`, { method: "PATCH", body: updates }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: REVIEWS });
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}
