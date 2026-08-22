import { useQuery } from '@tanstack/react-query';

import { artifactApi } from '../api/artifactApi';

export function useArtifactVersions(artifactId: string | undefined) {
  return useQuery({
    queryKey: ['artifacts', artifactId, 'versions'] as const,
    queryFn: () => artifactApi.listVersions(artifactId as string),
    enabled: artifactId !== undefined,
  });
}
