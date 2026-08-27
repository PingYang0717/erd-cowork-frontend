import { useMutation, useQueryClient } from '@tanstack/react-query';

import { artifactApi } from '@/api/artifactApi';

import { artifactQueryKey, artifactsQueryKey } from './useArtifacts';

/** Pinning is a toggle the backend resolves — the caller says which Artifact, not
 *  which direction. */
export function useToggleArtifactPin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => artifactApi.togglePin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey });
    },
  });
}

export function useDeleteArtifact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => artifactApi.deleteArtifact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey });
    },
  });
}

export function useShareArtifact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, targetIds }: { id: string; targetIds: string[] }) =>
      artifactApi.share(id, targetIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey });
    },
  });
}

/** 發布：把這個 Artifact 開放給別人使用。The mockup calls its button 生成 Artifact;
 *  what it does is publish (see `Artifact.publishedAt`). */
export function usePublishArtifact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => artifactApi.publish(id),
    onSuccess: (_artifact, id) => {
      queryClient.invalidateQueries({ queryKey: artifactQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey });
    },
  });
}
