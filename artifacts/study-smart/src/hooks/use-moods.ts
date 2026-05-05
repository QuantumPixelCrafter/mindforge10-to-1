import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
  useListMoods,
  useCreateMood,
  getListMoodsQueryKey,
  customFetch,
} from "@workspace/api-client-react";

export function useMoodsData() {
  return useListMoods();
}

export function useCreateMoodAction() {
  const queryClient = useQueryClient();
  return useCreateMood({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMoodsQueryKey() });
      },
    },
  });
}

export function useDeleteMoodAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/moods/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListMoodsQueryKey() });
    },
  });
}
