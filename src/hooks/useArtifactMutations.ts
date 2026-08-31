import { useMutation, useQueryClient } from '@tanstack/react-query';

import { artifactApi } from '@/api/artifactApi';

import { useActionErrorToast } from './useActionErrorToast';
import { artifactsQueryKey } from './useArtifacts';

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
/** Takes an Artifact back off the shelf. Unpublishing revokes access for everyone it
 *  was shared with — publication is what sharing rests on — so the caller is expected to
 *  have said so before reaching here. */
export function useUnpublishArtifact() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: (id: string) => artifactApi.unpublish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey });
    },
    onError: toastError,
  });
}

export function usePublishArtifact() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: (id: string) => artifactApi.publish(id),
    onSuccess: () => {
      // Only the list: publishedAt is metadata. The rendered HTML does not change on
      // publish, and its key lives in its own namespace now (artifactContentQueryKey).
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey });
    },
    onError: toastError,
  });
}
