import { useQuery } from '@tanstack/react-query';

import type { ArtifactTheme } from '@/types/api';

import { artifactApi } from '../api/artifactApi';

export function useArtifactContent(
  artifactId: string | undefined,
  theme: ArtifactTheme,
  versionId?: string,
) {
  return useQuery({
    queryKey: ['artifacts', artifactId, theme, versionId] as const,
    queryFn: () => artifactApi.getContent(artifactId as string, theme, versionId),
    enabled: artifactId !== undefined,
  });
}
