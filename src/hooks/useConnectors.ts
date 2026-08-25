import { useSuspenseQuery } from '@tanstack/react-query';

import { connectorApi } from '@/api/connectorApi';

export const connectorsQueryKey = ['connectors'] as const;

export function useConnectors() {
  return useSuspenseQuery({
    queryKey: connectorsQueryKey,
    queryFn: connectorApi.listConnectors,
  });
}
