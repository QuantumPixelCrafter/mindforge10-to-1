import { useQueryClient } from "@tanstack/react-query";
import {
  useListSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  useSkipScheduleDate,
  getListSchedulesQueryKey,
} from "@workspace/api-client-react";

export function useSchedulesData() {
  return useListSchedules();
}

export function useCreateScheduleAction() {
  const queryClient = useQueryClient();
  return useCreateSchedule({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() });
      },
    },
  });
}

export function useUpdateScheduleAction() {
  const queryClient = useQueryClient();
  return useUpdateSchedule({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() });
      },
    },
  });
}

export function useDeleteScheduleAction() {
  const queryClient = useQueryClient();
  return useDeleteSchedule({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() });
      },
    },
  });
}

export function useSkipScheduleDateAction() {
  const queryClient = useQueryClient();
  return useSkipScheduleDate({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() });
      },
    },
  });
}
