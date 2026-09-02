import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteSession, renameSession, toggleSessionPin } from '@/api/sessionApi';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import type { Artifact } from '@/types/api/index';
import type { Session } from '@/types/api/session';

import { useActionErrorToast } from './useActionErrorToast';
import { artifactsQueryKey } from './useArtifacts';
import { sessionDetailQueryKey } from './useSessionDetail';
import { sessionsQueryKey } from './useSessions';

export function useRenameSession() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => renameSession(id, title),
    onSuccess: (_result, { id, title }) => {
      // `exact`, or the list key — a prefix of every detail key — drags a refetch of
      // whatever session is open along with it, for a rename that cannot have touched
      // that session's messages. The renamed session's own detail does carry the title,
      // so that one key is invalidated by name: stale-marking an unmounted query costs
      // nothing, and a mounted one is exactly the case that needs the new title.
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey, exact: true });
      queryClient.invalidateQueries({ queryKey: sessionDetailQueryKey(id) });

      // An Artifact carries its session's name, denormalised, so the Gallery can say
      // where a card came from without fetching the session list. That copy has to be
      // corrected here — and it will not fix itself on a remount, because the rail's
      // badge keeps the artifacts list mounted on every page. Rewritten in place rather
      // than refetched: the new name is already in hand, and the list is otherwise
      // untouched by a rename.
      queryClient.setQueryData<Artifact[]>(artifactsQueryKey, (previous) =>
        previous?.map((artifact) =>
          artifact.sessionId === id ? { ...artifact, sessionTitle: title } : artifact,
        ),
      );
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
      // `exact`: pinnedAt lives on the list's Session rows and nowhere in a detail, so
      // there is nothing for the prefix cascade to deliver — only the open session's
      // messages re-downloaded for no reason.
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey, exact: true });
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
      // `exact`: the landing effect opens the next session, and mounting it is what
      // fetches its detail — the cascade would refetch every OTHER mounted detail too.
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey, exact: true });
    },
    onError: toastError,
  });
}
