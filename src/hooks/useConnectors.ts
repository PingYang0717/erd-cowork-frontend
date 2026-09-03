import { useSuspenseQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { listCatalogue } from '@/api/connectorApi';
import type { Connector } from '@/types/api';

import { useSessionDetail } from './useSessionDetail';

export const connectorsQueryKey = ['connectors'] as const;

/** One shared empty array: `?? []` inline would hand useMemo a new identity every render
 *  and the memo would never hold. */
const NONE: string[] = [];

/** The catalogue of known data sources, with this session's attachments applied.
 *
 *  Two sources of truth, deliberately: the catalogue says what exists and whether the
 *  user may reach it at all (`available` / `expired` / `no_access`), while the session
 *  says which of those it is actually drawing on. `connected` is therefore a fact about
 *  the session, not about the connector — the same source can be attached to one
 *  conversation and not another. */
export const useConnectors = (sessionId: string) => {
  const { data: catalogue } = useSuspenseQuery({
    queryKey: connectorsQueryKey,
    queryFn: listCatalogue,
  });
  const { data: detail } = useSessionDetail(sessionId);
  const attached = detail.dataSourceIds ?? NONE;

  return useMemo<Connector[]>(
    () =>
      catalogue.map((connector) =>
        attached.includes(connector.id)
          ? { ...connector, status: 'connected' }
          : // Anything the user could attach but has not reads as available here;
            // `expired` and `no_access` are the catalogue's word and outrank attachment.
            connector.status === 'connected'
            ? { ...connector, status: 'available' }
            : connector,
      ),
    [catalogue, attached],
  );
};
