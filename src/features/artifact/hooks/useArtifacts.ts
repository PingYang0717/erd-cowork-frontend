import { useQuery } from '@tanstack/react-query';

import { artifactApi } from '../api/artifactApi';

export const artifactsQueryKey = ['artifacts'] as const;

// Prefix shared by everything scoped to one Artifact: its versions list
// (useArtifactVersions) and its rendered content per theme and version
// (useArtifactContent). Invalidating it refreshes both.
export const artifactQueryKey = (artifactId: string) => ['artifacts', artifactId] as const;

export function useArtifacts() {
  return useQuery({
    queryKey: artifactsQueryKey,
    queryFn: artifactApi.listArtifacts,
  });
}
