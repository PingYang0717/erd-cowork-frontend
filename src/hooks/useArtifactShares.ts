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
  const { data, isFetching, isError } = useQuery({
    queryKey: artifactSharesQueryKey(artifactId),
    queryFn: () => listArtifactShares(artifactId),
    enabled,
  });

  return {
    shares: data ?? [],
    isLoading: enabled && isFetching,
    /** The list could not be read — the request failed, or it answered in a shape this
     *  client does not understand. Distinct from an empty list, which is an answer. */
    isUnavailable: isError,
  };
}
