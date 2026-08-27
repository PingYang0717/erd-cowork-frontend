import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';

import { artifactApi } from '@/api/artifactApi';
import { describeActionError } from '@/utils/describeLoadError';

import { artifactQueryKey, artifactsQueryKey } from './useArtifacts';

/** Failures surface to the user — nothing is disabled up front, so the error is how
 *  a not-yet-landed endpoint says so. Optional call: outside AppProviders (component
 *  tests) useApp returns an empty object, and a missing toast beats a crash. */
function useActionErrorToast() {
  const { message } = App.useApp();
  return (error: unknown) => message.error?.(describeActionError(error));
}

/** Pinning is a toggle the backend resolves — the caller says which Artifact, not
 *  which direction. */
export function useToggleArtifactPin() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: (id: string) => artifactApi.togglePin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey });
    },
    onError: toastError,
  });
}

export function useDeleteArtifact() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: (id: string) => artifactApi.deleteArtifact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey });
    },
    onError: toastError,
  });
}

export function useShareArtifact() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: ({ id, targetIds }: { id: string; targetIds: string[] }) =>
      artifactApi.share(id, targetIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey });
    },
    onError: toastError,
  });
}

/** 發布：把這個 Artifact 開放給別人使用。The mockup calls its button 生成 Artifact;
 *  what it does is publish (see `Artifact.publishedAt`). */
export function usePublishArtifact() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: (id: string) => artifactApi.publish(id),
    onSuccess: (_artifact, id) => {
      queryClient.invalidateQueries({ queryKey: artifactQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey });
    },
    onError: toastError,
  });
}
