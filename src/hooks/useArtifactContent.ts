import { useQuery } from '@tanstack/react-query';

import { artifactApi } from '@/api/artifactApi';
import type { ArtifactTheme } from '@/types/api/index';

/** The rendered Artifact HTML.
 *
 *  Deliberately NOT a suspense query, unlike every other data hook here. Its key carries
 *  the theme and the selected version, so switching either would suspend — unmounting
 *  the iframe and remounting it with a fresh document. The panel would blink and the
 *  artifact would lose whatever state its own script was holding. `useQuery` keeps the
 *  previous document on screen while the next one loads.
 */
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
