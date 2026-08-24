import { useMutation, useQueryClient } from '@tanstack/react-query';

import { sessionApi } from '@/api/sessionApi';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';

import { sessionsQueryKey } from './useSessions';

export function useCreateSession() {
  const queryClient = useQueryClient();
  const selectSession = useSessionSelectionStore((s) => s.selectSession);

  return useMutation({
    mutationFn: sessionApi.createSession,
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
      selectSession(session.id);
    },
  });
}

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

export function useSetSessionPinned() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      sessionApi.setSessionPinned(id, pinned),
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
