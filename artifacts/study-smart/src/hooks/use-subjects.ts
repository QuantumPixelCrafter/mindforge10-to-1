import { useQueryClient } from "@tanstack/react-query";
import {
  useListSubjects,
  useCreateSubject,
  useUpdateSubject,
  useDeleteSubject,
  getListSubjectsQueryKey,
} from "@workspace/api-client-react";

export function useSubjectsData() {
  return useListSubjects();
}

export function useCreateSubjectAction() {
  const queryClient = useQueryClient();
  return useCreateSubject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
      },
    },
  });
}

export function useUpdateSubjectAction() {
  const queryClient = useQueryClient();
  return useUpdateSubject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
      },
    },
  });
}

export function useDeleteSubjectAction() {
  const queryClient = useQueryClient();
  return useDeleteSubject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
      },
    },
  });
}
