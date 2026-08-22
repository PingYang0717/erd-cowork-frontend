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
