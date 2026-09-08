import { useSuspenseQuery } from '@tanstack/react-query';

import { listCatalogue } from '@/api/connectorApi';
import type { Connector } from '@/types/api';
import { useSessionDetail } from './useSessionDetail';

export const connectorsQueryKey = ['connectors'] as const;

export interface SessionConnectors {
  /** Every data source this user may reach, as the catalogue serves it. */
  catalogue: Connector[];
  /** Of those, the ids this conversation is drawing on. */
  attachedIds: string[];
}

/** The catalogue and this session's selection, side by side.
 *
 *  Two sources of truth, and they stay two: the catalogue says what exists and whether it
 *  can be chosen at all (`enabled`), while the session says which of them this
 *  conversation draws on. Folding them into one per-connector value — which is what a
 *  single `status` field was — puts a fact about the session inside an object about the
 *  connector, and the same source is attached to one conversation and not another. */
export const useConnectors = (sessionId: string): SessionConnectors => {
  const { data: catalogue } = useSuspenseQuery({
    queryKey: connectorsQueryKey,
    queryFn: listCatalogue,
  });
  const { data: detail } = useSessionDetail(sessionId);

  return { catalogue, attachedIds: detail.connectors };
};
