export type ConnectorStatus = 'connected' | 'available' | 'expired' | 'no_access';

export interface Connector {
  id: string;
  name: string;
  description: string;
  category: string;
  status: ConnectorStatus;
  custom?: boolean;
}
