import { useSuspenseQuery } from '@tanstack/react-query';

import { listArtifacts } from '@/api/artifactApi';

export const artifactsQueryKey = ['artifacts'] as const;

export const useArtifacts = () => {
  return useSuspenseQuery({
    queryKey: artifactsQueryKey,
    queryFn: listArtifacts,
  });
};
