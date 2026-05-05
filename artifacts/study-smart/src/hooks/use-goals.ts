import { useQueryClient } from "@tanstack/react-query";
import {
  useListGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  getListGoalsQueryKey,
} from "@workspace/api-client-react";

export function useGoalsData() {
  return useListGoals();
}

export function useCreateGoalAction() {
  const queryClient = useQueryClient();
  return useCreateGoal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
      },
    },
  });
}

export function useUpdateGoalAction() {
  const queryClient = useQueryClient();
  return useUpdateGoal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
      },
    },
  });
}

export function useDeleteGoalAction() {
  const queryClient = useQueryClient();
  return useDeleteGoal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
      },
    },
  });
}
