import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { apiClient } from '@/api/apiClient';
import { type BrowserJsError, useRepairOfferStore } from '@/stores/useRepairOfferStore';

/** Asks the agent to rebuild an artifact that threw, then reloads it.
 *  A repair that produced no improvement is reported, not swallowed: the user decides
 *  whether to try again. */
export function useArtifactRepair() {
  const queryClient = useQueryClient();
  const setStatus = useRepairOfferStore((store) => store.setStatus);
  const clear = useRepairOfferStore((store) => store.clear);

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
      } catch {
        setStatus('failed');
      }
    },
    [queryClient, setStatus, clear],
  );
}
