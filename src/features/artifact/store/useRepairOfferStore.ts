import { create } from 'zustand';

export interface BrowserJsError {
  message: string;
  line: number;
  col: number;
}

export type RepairStatus = 'pending' | 'repairing' | 'failed';

export interface RepairOffer {
  artifactId: string;
  errors: BrowserJsError[];
  status: RepairStatus;
}

/** An artifact that threw while running, and what the user has decided about it.
 *
 *  The error surfaces in the Artifact pane and the offer to fix it belongs in the
 *  thread — those are sibling panes, so this is what crosses between them.
 */
interface RepairOfferState {
  offer: RepairOffer | null;
  /** Artifacts the user told us to leave alone. Not offered again this session. */
  dismissed: string[];
  report: (artifactId: string, errors: BrowserJsError[]) => void;
  setStatus: (status: RepairStatus) => void;
  clear: () => void;
  dismiss: () => void;
}

export const useRepairOfferStore = create<RepairOfferState>((set, get) => ({
  offer: null,
  dismissed: [],

  report: (artifactId, errors) => {
    const { offer, dismissed } = get();
    // One offer at a time, and never for something already waved off.
    if (offer !== null || dismissed.includes(artifactId) || errors.length === 0) {
      return;
    }
    set({ offer: { artifactId, errors, status: 'pending' } });
  },

  setStatus: (status) =>
    set((state) => ({ offer: state.offer ? { ...state.offer, status } : null })),

  clear: () => set({ offer: null }),

  dismiss: () =>
    set((state) => ({
      offer: null,
      dismissed: state.offer ? [...state.dismissed, state.offer.artifactId] : state.dismissed,
    })),
}));
