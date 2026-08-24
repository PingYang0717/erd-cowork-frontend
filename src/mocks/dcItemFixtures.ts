import type { DcItem } from '@/types/api/dcItem';

/** Control parameters an SPC run can chart. `lo`/`hi` are the spec limits an engineer
 *  judges a chart against, so they travel with the item rather than being looked up. */
export const DC_ITEM_FIXTURES: DcItem[] = [
  { id: 'idsat', name: 'Idsat', unit: 'µA/µm', lo: 620, hi: 780 },
  { id: 'vt-gate-cd', name: 'Vt (gate CD)', unit: 'V', lo: 0.28, hi: 0.34 },
  { id: 'contact-rs', name: 'Contact Rs', unit: 'Ω', lo: 8.5, hi: 12.5 },
  { id: 'ioff', name: 'Ioff', unit: 'nA/µm', lo: 0.5, hi: 5 },
  { id: 'gate-cd', name: 'Gate CD', unit: 'nm', lo: 14.2, hi: 16.8 },
  { id: 'm1-rs', name: 'M1 Rs', unit: 'Ω/sq', lo: 0.09, hi: 0.13 },
  { id: 'via1-rc', name: 'Via1 Rc', unit: 'Ω', lo: 1.2, hi: 3.4 },
  { id: 'fin-height', name: 'Fin height', unit: 'nm', lo: 46, hi: 54 },
];

/** Rough per-item row count, only used to make the reask's "資料量偏大" honest. */
export const ROWS_PER_DC_ITEM = 3200;
