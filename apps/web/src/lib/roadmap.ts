import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import type { IdeaKind, IdeaResponse, IdeaStatus, RoadmapResponse } from "@servicebook/types";
import { apiRequest } from "./apiClient";

const ROADMAP_KEY = ["roadmap"] as const;

export function useRoadmap(): UseQueryResult<RoadmapResponse> {
  // Signed-in owners send their token so their votes follow them between devices.
  return useQuery({ queryKey: ROADMAP_KEY, queryFn: () => apiRequest<RoadmapResponse>("/api/roadmap") });
}

export function useVote(): UseMutationResult<IdeaResponse, unknown, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<IdeaResponse>(`/api/roadmap/${id}/vote`, { method: "POST" }),
    // Update the count and "voted" state in place, without refetching the whole board.
    onSuccess: ({ item, voted }) =>
      queryClient.setQueryData<RoadmapResponse>(ROADMAP_KEY, (current) =>
        current
          ? {
              ...current,
              items: current.items.map((entry) => (entry.id === item.id ? { ...entry, votes: item.votes } : entry)),
              myVotes: voted ? [...new Set([...current.myVotes, item.id])] : current.myVotes.filter((id) => id !== item.id),
            }
          : current,
      ),
  });
}

export function useSuggestIdea(): UseMutationResult<IdeaResponse, unknown, { title: string; description?: string; kind: IdeaKind }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => apiRequest<IdeaResponse>("/api/roadmap", { method: "POST", body: input }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ROADMAP_KEY }),
  });
}

export function useUpdateIdea(): UseMutationResult<IdeaResponse, unknown, { id: string; status?: IdeaStatus; hidden?: boolean }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }) => apiRequest<IdeaResponse>(`/api/roadmap/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ROADMAP_KEY }),
  });
}
