import { useQuery } from '@tanstack/react-query';

import { artifactApi } from '@/api/artifactApi';

export const artifactVersionsQueryKey = (artifactId: string | undefined) =>
  ['artifacts', artifactId, 'versions'] as const;

export function useArtifactVersions(artifactId: string | undefined) {
  return useQuery({
    queryKey: artifactVersionsQueryKey(artifactId),
    queryFn: () => artifactApi.listVersions(artifactId as string),
    enabled: artifactId !== undefined,
  });
}
