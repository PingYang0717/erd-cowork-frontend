import type { Connector } from '@/types/api';

export function selectConnected(connectors: Connector[]): Connector[] {
  return connectors.filter((connector) => connector.status === 'connected');
}
