import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useCallback } from 'react';

import { apiClient } from '@/api/apiClient';
import { useActiveRunStore } from '@/stores/useActiveRunStore';
import { type BrowserJsError, useRepairOfferStore } from '@/stores/useRepairOfferStore';

/** The backend's code for "the files this artifact was built from are gone". */
function isFilesExpired(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    (error.response?.data as { code?: string } | undefined)?.code === 'FILES_EXPIRED'
  );
}

/** Asks the agent to rebuild an artifact that threw, then reloads it.
 *  A repair that produced no improvement is reported, not swallowed: the user decides
 *  whether to try again. */
export function useArtifactRepair() {
  const queryClient = useQueryClient();
  const setStatus = useRepairOfferStore((store) => store.setStatus);
  const clear = useRepairOfferStore((store) => store.clear);
  const bumpArtifactReload = useActiveRunStore((store) => store.bumpArtifactReload);

  return useCallback(
    async (artifactId: string, errors: BrowserJsError[]) => {
      setStatus('repairing');

      try {
        const { repaired } = await apiClient.post<{ repaired: boolean }>(
          `/artifacts/${artifactId}/repair`,
          { errors },
        );

        if (!repaired) {
          setStatus('failed');
          return;
        }

        clear();
        await queryClient.invalidateQueries({ queryKey: ['artifacts', artifactId] });
        // Refetching is not enough: the wedged document is still mounted, holding
        // whatever state made it throw. A Reload replaces it.
        bumpArtifactReload();
      } catch (error) {
        // Retention deleted the source data. Another attempt runs against the same
        // absence, so the card stops offering one — the composer's retention notice is
        // where the user finds out what to do instead.
        setStatus(isFilesExpired(error) ? 'files-expired' : 'failed');
      }
    },
    [queryClient, setStatus, clear, bumpArtifactReload],
  );
}
