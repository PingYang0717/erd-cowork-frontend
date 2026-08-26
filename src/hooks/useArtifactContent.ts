import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { artifactApi } from '@/api/artifactApi';
import type { ArtifactTheme } from '@/types/api/index';

/** The rendered Artifact HTML.
 *
 *  Deliberately NOT a suspense query, unlike every other data hook here. Its key carries
 *  the theme, so switching it would suspend — unmounting the iframe and remounting it
 *  with a fresh document. The panel would blink and the artifact would lose whatever
 *  state its own script was holding. `keepPreviousData` is what actually holds the old
 *  document on screen while the next one loads: without it a changed key empties `data`.
 *
 *  `reloadNonce` is the opposite intent, and shares the key on purpose: bumping it
 *  refetches AND — because `ArtifactFrame` keys its iframe on it too — remounts the
 *  document, which is the whole point of a Reload (ADR-0001).
 */
export function useArtifactContent(
  artifactId: string | undefined,
  theme: ArtifactTheme,
  reloadNonce = 0,
) {
  return useQuery({
    queryKey: ['artifacts', artifactId, theme, reloadNonce] as const,
    queryFn: () => artifactApi.getContent(artifactId as string, theme),
    enabled: artifactId !== undefined,
    placeholderData: keepPreviousData,
  });
}
