import { http, HttpResponse } from 'msw';

import type { Connector } from '@/types/api';

/** The catalogue of known data sources: what exists and whether it can be chosen.
 *  Which of these a given conversation is drawing on lives on the session
 *  (`SessionDetail.connectors`), not here — that is a fact about a session, so no entry
 *  in the catalogue claims it. Two are `enabled: false` so the unavailable state and the
 *  status filter have something to act on.
 *
 *  This moved out of `src/api/connectorApi.ts`, which had 73 lines of fixture and not
 *  one HTTP call — a fake backend living in the runtime layer (ADR-0006). */
export const CATALOGUE: Connector[] = [
  {
    id: 'inline',
    name: 'Inline',
    description: 'In-line metrology & process parametric',
    type: 'Process',
    enabled: true,
  },
  {
    id: 'wat',
    name: 'WAT',
    description: 'Wafer Acceptance Test (e-test parametric)',
    type: 'Test',
    enabled: true,
  },
  {
    id: 'cp',
    name: 'CP',
    description: 'Circuit Probe / wafer sort bin & yield',
    type: 'Test',
    enabled: true,
  },
  {
    id: 'lot',
    name: 'Lot Info',
    description: 'Lot genealogy, route & hold',
    type: 'Lot',
    enabled: true,
  },
  {
    id: 'lotabn',
    name: 'Lot Abnormal',
    description: 'Qtime OOS, running hold, inline OOS, etc.',
    type: 'Lot',
    enabled: true,
  },
  {
    id: 'process',
    name: 'Process',
    description: 'EXP Result, Qtime',
    type: 'Process',
    enabled: true,
  },
  {
    id: 'defect',
    name: 'Defect',
    description: 'Defect inspection & wafer map',
    type: 'Defect',
    enabled: true,
  },
  {
    id: 'tem',
    name: 'TEM',
    description: 'Cross-section TEM images & analysis',
    type: 'Physical',
    enabled: true,
  },
  {
    id: 'recipe',
    name: 'Recipe',
    description: 'Process recipe params & splits',
    type: 'Equipment',
    enabled: false,
  },
  {
    id: 'tool',
    name: 'Offline Tool Log',
    description: 'Tool events, chamber & maintenance',
    type: 'Equipment',
    enabled: false,
  },
];

export const connectorHandlers = [http.get('/api/connectors', () => HttpResponse.json(CATALOGUE))];
