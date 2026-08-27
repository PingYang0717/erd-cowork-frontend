import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { artifactApi } from '@/api/artifactApi';

/** The rendered Artifact HTML.
 *
 *  Deliberately NOT a suspense query, unlike every other data hook here: both key
 *  members change while a document is already on screen (switching version, bumping
 *  the reload nonce), and suspending then would blank the panel to a fallback.
 *  `keepPreviousData` holds the old document visible until the next one has arrived —
 *  without it a changed key empties `data` and the iframe flashes empty.
 *
 *  `reloadNonce` shares the key on purpose: bumping it refetches AND — because
 *  `ArtifactFrame` keys its iframe on it too — remounts the document, which is the
 *  whole point of a Reload (ADR-0001).
 */
export function useArtifactContent(artifactId: string | undefined, reloadNonce = 0) {
  return useQuery({
    queryKey: ['artifacts', artifactId, reloadNonce] as const,
    queryFn: () => artifactApi.getContent(artifactId as string, reloadNonce),
    enabled: artifactId !== undefined,
    placeholderData: keepPreviousData,
  });
}
