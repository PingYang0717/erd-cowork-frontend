import { useMutation, useQueryClient } from '@tanstack/react-query';

import { artifactApi } from '../api/artifactApi';
import { artifactsQueryKey } from './useArtifacts';

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

export function useRegenerateArtifact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => artifactApi.regenerate(id),
    onSuccess: (_version, id) => {
      queryClient.invalidateQueries({ queryKey: ['artifacts', id, 'versions'] });
    },
  });
}
