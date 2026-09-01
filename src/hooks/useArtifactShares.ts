import { useQuery } from '@tanstack/react-query';

import { listArtifactShares } from '@/api/artifactApi';

export function artifactSharesQueryKey(artifactId: string) {
  return ['artifactShares', artifactId] as const;
}

/** Who an Artifact is already shared with.
 *
 *  Not a suspense query, and only enabled while the dialog is open: the list is read
 *  when someone opens the dialog, so suspending would blank the pane behind it, and
 *  fetching it for every card in a Gallery would be a request per card for something
 *  nobody asked to see.
 */
export function useArtifactShares(artifactId: string, enabled: boolean) {
  const { data, isFetching } = useQuery({
    queryKey: artifactSharesQueryKey(artifactId),
    queryFn: () => listArtifactShares(artifactId),
    enabled,
  });

  // Narrowed rather than trusted, for the same reason the directory search is: a body
  // that is not a list must read as "nobody yet", not throw inside the dialog.
  return { shares: Array.isArray(data) ? data : [], isLoading: enabled && isFetching };
}
