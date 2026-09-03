import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getArtifactContent } from '@/api/artifactApi';

/** Prefix for one Artifact's rendered HTML, all reload nonces included.
 *
 *  Deliberately NOT under `['artifacts', …]`: the list mutations (pin / publish /
 *  share) invalidate that prefix, and with the content underneath it every one of
 *  them re-downloaded the full document for nothing — the HTML does not change when
 *  its metadata does. Content refetch has exactly two owners: the full-page Refresh
 *  button and a successful repair, both through this key. */
export const artifactContentQueryKey = (artifactId: string) => {
  return ['artifactContent', artifactId] as const;
};

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
export const useArtifactContent = (artifactId: string | undefined, reloadNonce = 0) => {
  return useQuery({
    queryKey: [...artifactContentQueryKey(artifactId as string), reloadNonce] as const,
    queryFn: () => getArtifactContent(artifactId as string, reloadNonce),
    enabled: artifactId !== undefined,
    placeholderData: keepPreviousData,
    // An Artifact's HTML never changes once produced, so it never goes stale on its
    // own — without this, switching versions A→B→A downloaded the whole document a
    // third time for nothing. The two real refresh paths are untouched: Reload bumps
    // the nonce (a different key), and a repair invalidates the key by name, which
    // overrides staleTime.
    staleTime: Infinity,
  });
};
