import { useMutation, useQueryClient } from '@tanstack/react-query';

import { addConnector as addConnectorRequest } from '@/api/connectorApi';
import { attachDataSource, detachDataSource } from '@/api/sessionApi';

import { useActionErrorToast } from './useActionErrorToast';
import { connectorsQueryKey } from './useConnectors';
import { sessionDetailQueryKey } from './useSessionDetail';

/** Attaches or detaches a data source for one conversation.
 *
 *  The write goes to the session, not to the connector: `connected` is a fact about
 *  what this conversation may read, and the same source can be attached to one session
 *  and not another. Invalidating the session detail is what refreshes the panel, since
 *  that is where attachment lives. */
export function useSetSessionDataSource(sessionId: string) {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: ({ id, attached }: { id: string; attached: boolean }) =>
      attached ? attachDataSource(sessionId, id) : detachDataSource(sessionId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionDetailQueryKey(sessionId) });
    },
    // A write that fails silently is how a choice quietly stops sticking.
    onError: toastError,
  });
}

/** Adds a source to the catalogue and attaches it to this session in one act — adding
 *  one IS choosing it, and the catalogue alone would leave it listed but unused. */
export function useAddConnector(sessionId: string) {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: async (name: string) => {
      const id = await addConnectorRequest(name);
      await attachDataSource(sessionId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectorsQueryKey });
      queryClient.invalidateQueries({ queryKey: sessionDetailQueryKey(sessionId) });
    },
    onError: toastError,
  });
}
