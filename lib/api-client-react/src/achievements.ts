import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { AchievementsResponse, CheckAchievementsResponse } from "./generated/api.schemas";

export const getAchievementsQueryKey = () => ["achievements"] as const;

export function useGetAchievements() {
  return useQuery({
    queryKey: getAchievementsQueryKey(),
    queryFn: () => customFetch<AchievementsResponse>("/api/achievements"),
  });
}

export function useCheckAchievements() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      customFetch<CheckAchievementsResponse>("/api/achievements/check", {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getAchievementsQueryKey() });
    },
  });
}
