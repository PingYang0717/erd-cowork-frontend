import type { Connector } from '@/types/api/index';

export function selectConnected(connectors: Connector[]): Connector[] {
  return connectors.filter((connector) => connector.status === 'connected');
}
