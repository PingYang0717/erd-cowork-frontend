import type { Connector, ConnectorStatus } from '@/types/api/index';

import { apiClient } from './apiClient';

/** Stub for a read the backend has not built yet (ADR-0009). The ten fixtures the mock
 *  backend used to serve, verbatim — all four statuses have to be present for the
 *  panel's per-state styling and status filter to mean anything. */
const STUB_CONNECTORS: Connector[] = [
  {
    id: 'inline',
    name: 'Inline',
    description: 'In-line metrology & process parametric',
    category: 'Process',
    status: 'connected',
  },
  {
    id: 'wat',
    name: 'WAT',
    description: 'Wafer Acceptance Test (e-test parametric)',
    category: 'Test',
    status: 'connected',
  },
  {
    id: 'cp',
    name: 'CP',
    description: 'Circuit Probe / wafer sort bin & yield',
    category: 'Test',
    status: 'connected',
  },
  {
    id: 'lot',
    name: 'Lot Info',
    description: 'Lot genealogy, route & hold',
    category: 'Lot',
    status: 'available',
  },
  {
    id: 'lotabn',
    name: 'Lot Abnormal',
    description: 'Qtime OOS, running hold, inline OOS, etc.',
    category: 'Lot',
    status: 'available',
  },
  {
    id: 'process',
    name: 'Process',
    description: 'EXP Result, Qtime',
    category: 'Process',
    status: 'available',
  },
  {
    id: 'defect',
    name: 'Defect',
    description: 'Defect inspection & wafer map',
    category: 'Defect',
    status: 'available',
  },
  {
    id: 'tem',
    name: 'TEM',
    description: 'Cross-section TEM images & analysis',
    category: 'Physical',
    status: 'available',
  },
  {
    id: 'recipe',
    name: 'Recipe',
    description: 'Process recipe params & splits',
    category: 'Equipment',
    status: 'expired',
  },
  {
    id: 'tool',
    name: 'Offline Tool Log',
    description: 'Tool events, chamber & maintenance',
    category: 'Equipment',
    status: 'no_access',
  },
];

export const connectorApi = {
  /** Stubbed: no backend connector endpoints (ADR-0009). */
  listConnectors: () => Promise.resolve(STUB_CONNECTORS),

  // No caller: connecting, disconnecting and adding are all disabled in the panel.
  // Kept as the shape the backend will implement.
  setStatus: (id: string, status: ConnectorStatus) =>
    apiClient.patch<Connector>(`/connectors/${id}`, { status }),

  addConnector: (name: string) => apiClient.post<Connector>('/connectors', { name }),
};
