import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { errorCode } from '@/api/apiError';
import { repairArtifact } from '@/api/artifactApi';
import { artifactContentQueryKey } from '@/hooks/useArtifactContent';
import { useActiveRunStore } from '@/stores/useActiveRunStore';
import { type BrowserJsError, useRepairOfferStore } from '@/stores/useRepairOfferStore';

/** The backend's code for "the files this artifact was built from are gone". */
const isFilesExpired = (error: unknown): boolean => errorCode(error) === 'FILES_EXPIRED';

/** Asks the agent to rebuild an artifact that threw, then reloads it.
 *  A repair that produced no improvement is reported, not swallowed: the user decides
 *  whether to try again. */
export function useArtifactRepair() {
  const queryClient = useQueryClient();
  const setStatus = useRepairOfferStore((store) => store.setStatus);
  const resolve = useRepairOfferStore((store) => store.resolve);
  const bumpArtifactReload = useActiveRunStore((store) => store.bumpArtifactReload);

  return useCallback(
    async (artifactId: string, errors: BrowserJsError[]) => {
      setStatus(artifactId, 'repairing');

      try {
        const { repaired } = await repairArtifact(artifactId, errors);

        if (!repaired) {
          setStatus(artifactId, 'failed');
          return;
        }

        // resolve() no-ops if the offer is no longer this artifact's (the user switched
        // away mid-repair), so the reload below is only reached for the offer we own.
        resolve(artifactId);
        await queryClient.invalidateQueries({ queryKey: artifactContentQueryKey(artifactId) });
        // Refetching is not enough: the wedged document is still mounted, holding
        // whatever state made it throw. A Reload replaces it.
        bumpArtifactReload();
      } catch (error) {
        // Retention deleted the source data. Another attempt runs against the same
        // absence, so the card stops offering one — the composer's retention notice is
        // where the user finds out what to do instead.
        setStatus(artifactId, isFilesExpired(error) ? 'files-expired' : 'failed');
      }
    },
    [queryClient, setStatus, resolve, bumpArtifactReload],
  );
}
