import { useMutation, useQueryClient } from '@tanstack/react-query';

import { sessionApi } from '@/api/sessionApi';

import { useActionErrorToast } from './useActionErrorToast';
import { sessionsQueryKey } from './useSessions';

export function useRenameSession() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      sessionApi.renameSession(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
    },
    onError: toastError,
  });
}

/** Toggle-style like the artifact pin: the backend decides the direction and stamps
 *  the time, so the call site sends nothing but the id. */
export function useToggleSessionPin() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: (id: string) => sessionApi.togglePin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
    },
    onError: toastError,
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: sessionApi.deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
    },
    onError: toastError,
  });
}
