import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteSession, renameSession, toggleSessionPin } from '@/api/sessionApi';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import type { Session } from '@/types/api/session';

import { useActionErrorToast } from './useActionErrorToast';
import { sessionDetailQueryKey } from './useSessionDetail';
import { sessionsQueryKey } from './useSessions';

export function useRenameSession() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => renameSession(id, title),
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
    mutationFn: (id: string) => toggleSessionPin(id),
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
    mutationFn: deleteSession,
    onSuccess: (_result, deletedId) => {
      // Drop it from the list *before* clearing the selection, not after. The landing
      // effect in useSessionGroups runs on the next render and opens the most recent
      // session it can see; against a list still holding the deleted one — the most
      // recent, since you were just in it — it would re-select what was deleted, and the
      // thread would carry on rendering that conversation from cache.
      queryClient.setQueryData<Session[]>(sessionsQueryKey, (previous) =>
        previous?.filter((session) => session.id !== deletedId),
      );

      // Deleting the session you are in has to close it too. Left selected, the thread
      // keeps pointing at an id the backend no longer has, and the next message
      // re-creates it (ADR-0005 upserts on send) — the delete would undo itself.
      if (useSessionSelectionStore.getState().selectedSessionId === deletedId) {
        clearSelection();
      }

      // Its thread is no longer reachable, and leaving it cached means anything that
      // lands on the id again renders a deleted conversation. Removed after the
      // selection moves off it, so nothing is reading it at the moment it goes.
      queryClient.removeQueries({ queryKey: sessionDetailQueryKey(deletedId) });
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
    },
    onError: toastError,
  });
}
