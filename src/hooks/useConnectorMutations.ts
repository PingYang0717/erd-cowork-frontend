import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import {
  addConnector as addConnectorRequest,
  readRememberedSelection,
  rememberSelection,
} from '@/api/connectorApi';
import { attachDataSource, detachDataSource } from '@/api/sessionApi';
import type { SessionDetail } from '@/types/api/session';

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
    onSuccess: (_result, { id, attached }) => {
      // Remember what the user is working with. The same person grants roughly the same
      // capabilities every time, so the next conversation can open on this combination
      // instead of asking them to pick it again.
      const current = new Set(
        queryClient.getQueryData<SessionDetail>(sessionDetailQueryKey(sessionId))?.dataSourceIds ??
          [],
      );
      if (attached) {
        current.add(id);
      } else {
        current.delete(id);
      }
      rememberSelection([...current]);
      queryClient.invalidateQueries({ queryKey: sessionDetailQueryKey(sessionId) });
    },
    // A write that fails silently is how a choice quietly stops sticking.
    onError: toastError,
  });
}

/** Carries the user's remembered connector combination into a conversation that has
 *  none of its own.
 *
 *  Called on send rather than when the conversation is opened, because that is when the
 *  session comes into being (ADR-0005) — attaching earlier would mint a session for every
 *  "New chat" click the user never followed through on. Awaited before the message so the
 *  run that message starts already has the capabilities.
 *
 *  Failure is deliberately swallowed: a connector is something the agent MAY use, so
 *  losing the pre-selection is a smaller harm than refusing to send the message. */
export function useApplyRememberedDataSources(sessionId: string) {
  const queryClient = useQueryClient();

  return useCallback(
    async (currentIds: string[]) => {
      if (currentIds.length > 0) {
        return;
      }
      const remembered = readRememberedSelection();
      if (remembered.length === 0) {
        return;
      }
      try {
        await Promise.all(remembered.map((id) => attachDataSource(sessionId, id)));
        await queryClient.invalidateQueries({ queryKey: sessionDetailQueryKey(sessionId) });
      } catch {
        // Nothing to tell the user: the conversation runs either way.
      }
    },
    [sessionId, queryClient],
  );
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
