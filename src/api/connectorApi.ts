import { CONNECTOR_PREFS_STORAGE_KEY } from '@/constants/storage';
import type { Connector } from '@/types/api/index';

/** The catalogue of known sources (the ten fixtures the mock backend used to serve,
 *  verbatim — all four statuses present so the per-state styling and the status
 *  filter mean something). Which of these a conversation is actually drawing on is the
 *  session's business, not the catalogue's — see useConnectors. */
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

/** Custom sources the user added. Still localStorage: adding a source to the catalogue
 *  is a different act from attaching one to a conversation, and only the latter has an
 *  endpoint (PATCH /sessions/{id}/data-source). */
interface ConnectorPrefs {
  custom: Connector[];
}

function readPrefs(): ConnectorPrefs {
  try {
    const raw = localStorage.getItem(CONNECTOR_PREFS_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<ConnectorPrefs>;
      return { custom: parsed.custom ?? [] };
    }
  } catch {
    // A corrupt entry reads as "no preferences" and gets overwritten on the next write.
  }
  return { custom: [] };
}

function writePrefs(prefs: ConnectorPrefs): void {
  localStorage.setItem(CONNECTOR_PREFS_STORAGE_KEY, JSON.stringify(prefs));
}

export const connectorApi = {
  /** What data sources exist and whether the user may reach them. Async only to keep
   *  the query seam — nothing here leaves the browser yet. Whether a given conversation
   *  is drawing on one is the session's business (useConnectors joins the two). */
  listCatalogue: (): Promise<Connector[]> => {
    const prefs = readPrefs();
    return Promise.resolve([...STUB_CONNECTORS, ...prefs.custom]);
  },

  /** Adds a source to the catalogue and answers its id, so the caller can attach it to
   *  the session it was added from — adding one IS choosing it. */
  addConnector: (name: string): Promise<string> => {
    const prefs = readPrefs();
    const id = `custom-${crypto.randomUUID()}`;
    writePrefs({
      ...prefs,
      custom: [
        ...prefs.custom,
        {
          id,
          name,
          description: 'Custom data source',
          category: 'Custom',
          status: 'available',
          custom: true,
        },
      ],
    });
    return Promise.resolve(id);
  },
};
