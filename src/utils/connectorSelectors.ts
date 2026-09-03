import type { Connector } from '@/types/api';

export const selectConnected = (connectors: Connector[]): Connector[] => {
  return connectors.filter((connector) => connector.status === 'connected');
};
