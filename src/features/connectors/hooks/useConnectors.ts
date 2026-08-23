import { useQuery } from '@tanstack/react-query';

import { connectorApi } from '../api/connectorApi';

export const connectorsQueryKey = ['connectors'] as const;

export function useConnectors() {
  return useQuery({
    queryKey: connectorsQueryKey,
    queryFn: connectorApi.listConnectors,
  });
}
