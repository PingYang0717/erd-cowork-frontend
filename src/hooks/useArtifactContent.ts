import { useQuery } from '@tanstack/react-query';

import { artifactApi } from '@/api/artifactApi';
import type { ArtifactTheme } from '@/types/api/index';

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
