import { useMutation, useQueryClient } from '@tanstack/react-query';

import { connectorApi } from '@/api/connectorApi';
import type { ConnectorStatus } from '@/types/api/index';

import { connectorsQueryKey } from './useConnectors';

export function useSetConnectorStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ConnectorStatus }) =>
      connectorApi.setStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectorsQueryKey });
    },
  });
}

export function useAddConnector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => connectorApi.addConnector(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectorsQueryKey });
    },
  });
}
