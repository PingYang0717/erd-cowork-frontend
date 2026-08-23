import { apiClient } from '@/services/apiClient';
import type { Connector, ConnectorStatus } from '@/types/api';

export const connectorApi = {
  listConnectors: () => apiClient.get<Connector[]>('/connectors'),

  setStatus: (id: string, status: ConnectorStatus) =>
    apiClient.patch<Connector>(`/connectors/${id}`, { status }),

  addConnector: (name: string) => apiClient.post<Connector>('/connectors', { name }),
};
