import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';

import { sessionApi } from '@/api/sessionApi';
import { describeActionError } from '@/utils/describeLoadError';

import { sessionsQueryKey } from './useSessions';

/** All three writes surface their failure to the user: nothing here is disabled up
 *  front, so the error message is how a not-yet-landed endpoint says so.
 *  `message.error?.` — outside AppProviders (component tests) useApp returns an
 *  empty object, and a missing toast is better than a crashed test. */
function useActionErrorToast() {
  const { message } = App.useApp();
  return (error: unknown) => message.error?.(describeActionError(error));
}

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
