import { CONNECTOR_PREFS_STORAGE_KEY } from '@/constants/storage';
import type { Connector, ConnectorStatus } from '@/types/api/index';

/** The catalogue of known sources (the ten fixtures the mock backend used to serve,
 *  verbatim — all four statuses present so the per-state styling and the status
 *  filter mean something). The user's own choices overlay this, from localStorage. */
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

/** The user's overlay on the catalogue: status choices per source, plus custom
 *  sources. localStorage, not backend state — there are no connector endpoints this
 *  round, and a preference should survive a reload. */
interface ConnectorPrefs {
  statusById: Record<string, ConnectorStatus>;
  custom: Connector[];
}

function readPrefs(): ConnectorPrefs {
  try {
    const raw = localStorage.getItem(CONNECTOR_PREFS_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<ConnectorPrefs>;
      return { statusById: parsed.statusById ?? {}, custom: parsed.custom ?? [] };
    }
  } catch {
    // A corrupt entry reads as "no preferences" and gets overwritten on the next write.
  }
  return { statusById: {}, custom: [] };
}

function writePrefs(prefs: ConnectorPrefs): void {
  localStorage.setItem(CONNECTOR_PREFS_STORAGE_KEY, JSON.stringify(prefs));
}

export const connectorApi = {
  /** The catalogue with the user's choices applied. Async only to keep the query
   *  seam — nothing here leaves the browser. */
  listConnectors: (): Promise<Connector[]> => {
    const prefs = readPrefs();
    const catalogue = STUB_CONNECTORS.map((connector) =>
      prefs.statusById[connector.id] !== undefined
        ? { ...connector, status: prefs.statusById[connector.id] }
        : connector,
    );
    return Promise.resolve([...catalogue, ...prefs.custom]);
  },

  setStatus: (id: string, status: ConnectorStatus): Promise<void> => {
    const prefs = readPrefs();
    writePrefs({
      statusById: { ...prefs.statusById, [id]: status },
      custom: prefs.custom.map((connector) =>
        connector.id === id ? { ...connector, status } : connector,
      ),
    });
    return Promise.resolve();
  },

  /** A custom source starts connected — adding one IS choosing it. */
  addConnector: (name: string): Promise<void> => {
    const prefs = readPrefs();
    writePrefs({
      ...prefs,
      custom: [
        ...prefs.custom,
        {
          id: `custom-${crypto.randomUUID()}`,
          name,
          description: 'Custom data source',
          category: 'Custom',
          status: 'connected',
          custom: true,
        },
      ],
    });
    return Promise.resolve();
  },
};
