import { useMutation, useQueryClient } from '@tanstack/react-query';

import { artifactApi } from '../api/artifactApi';
import { artifactQueryKey, artifactsQueryKey } from './useArtifacts';

export function useSetArtifactPinned() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      artifactApi.setPinned(id, pinned),
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

export function useGenerateArtifactVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, versionId }: { id: string; versionId: string }) =>
      artifactApi.generateVersion(id, versionId),
    onSuccess: (_version, { id }) => {
      queryClient.invalidateQueries({ queryKey: artifactQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey });
    },
  });
}

export function useRegenerateArtifact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => artifactApi.regenerate(id),
    onSuccess: (_version, id) => {
      // The new version has content of its own, so the panel needs a fresh
      // render as well as a fresh version list.
      queryClient.invalidateQueries({ queryKey: artifactQueryKey(id) });
    },
  });
}
