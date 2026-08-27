import { useMutation, useQueryClient } from '@tanstack/react-query';

import { sessionApi } from '@/api/sessionApi';

import { sessionsQueryKey } from './useSessions';

export function useRenameSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      sessionApi.renameSession(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
    },
  });
}

/** Pinning is a yes/no intent at the call site; the wire carries `pinnedAt`, so the
 *  clock is read here rather than in every row that offers the menu item. */
export function useSetSessionPinned() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      sessionApi.setSessionPinned(id, pinned ? new Date().toISOString() : null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sessionApi.deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
    },
  });
}
