import { useSuspenseQuery } from '@tanstack/react-query';

import { artifactApi } from '@/api/artifactApi';

export const artifactVersionsQueryKey = (artifactId: string) =>
  ['artifacts', artifactId, 'versions'] as const;

/** An Artifact's version history. Takes an Artifact that definitely exists — the
 *  not-found case is decided by the caller, above this hook. */
export function useArtifactVersions(artifactId: string) {
  return useSuspenseQuery({
    queryKey: artifactVersionsQueryKey(artifactId),
    queryFn: () => artifactApi.listVersions(artifactId),
  });
}
