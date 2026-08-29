import { useMutation, useQueryClient } from '@tanstack/react-query';

import { sessionApi } from '@/api/sessionApi';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';

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
  const clearSelection = useSessionSelectionStore((store) => store.clearSelection);

  return useMutation({
    mutationFn: sessionApi.deleteSession,
    onSuccess: (_result, deletedId) => {
      // Deleting the session you are in has to close it too. Left selected, the thread
      // keeps pointing at an id the backend no longer has, and the next message
      // re-creates it (ADR-0005 upserts on send) — the delete would undo itself.
      if (useSessionSelectionStore.getState().selectedSessionId === deletedId) {
        clearSelection();
      }
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
    },
    onError: toastError,
  });
}
