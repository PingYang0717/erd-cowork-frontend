import { useSuspenseQuery } from '@tanstack/react-query';

import { artifactApi } from '@/api/artifactApi';

export const artifactsQueryKey = ['artifacts'] as const;

export function useArtifacts() {
  return useSuspenseQuery({
    queryKey: artifactsQueryKey,
    queryFn: artifactApi.listArtifacts,
  });
}
