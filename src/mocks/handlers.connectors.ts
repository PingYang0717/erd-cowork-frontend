import { http, HttpResponse } from 'msw';

import type { Connector } from '@/types/api/index';

/** The catalogue of known data sources: what exists and whether the user may reach it.
 *  Which of these a given conversation is drawing on lives on the session
 *  (`dataSourceIds`), not here — `connected` is a fact about a session, so no entry in
 *  the catalogue claims it. All the other statuses are present so the per-state styling
 *  and the status filter mean something.
 *
 *  This moved out of `src/api/connectorApi.ts`, which had 73 lines of fixture and not
 *  one HTTP call — a fake backend living in the runtime layer (ADR-0006). */
const CATALOGUE: Connector[] = [
  {
    id: 'inline',
    name: 'Inline',
    description: 'In-line metrology & process parametric',
    category: 'Process',
    status: 'available',
  },
  {
    id: 'wat',
    name: 'WAT',
    description: 'Wafer Acceptance Test (e-test parametric)',
    category: 'Test',
    status: 'available',
  },
  {
    id: 'cp',
    name: 'CP',
    description: 'Circuit Probe / wafer sort bin & yield',
    category: 'Test',
    status: 'available',
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

export const connectorHandlers = [http.get('/api/connectors', () => HttpResponse.json(CATALOGUE))];
