import { useMutation, useQueryClient } from '@tanstack/react-query';

import { connectorApi } from '@/api/connectorApi';
import type { ConnectorStatus } from '@/types/api/index';

import { useActionErrorToast } from './useActionErrorToast';
import { connectorsQueryKey } from './useConnectors';

export function useSetConnectorStatus() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ConnectorStatus }) =>
      connectorApi.setStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectorsQueryKey });
    },
    // localStorage today, a backend endpoint once one lands — and a write that fails
    // silently is how a preference quietly stops sticking.
    onError: toastError,
  });
}

export function useAddConnector() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: (name: string) => connectorApi.addConnector(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectorsQueryKey });
    },
    onError: toastError,
  });
}
