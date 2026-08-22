export type ConnectorStatus = 'connected' | 'available' | 'expired' | 'no_access';

export interface Connector {
  id: string;
  name: string;
  status: ConnectorStatus;
}
