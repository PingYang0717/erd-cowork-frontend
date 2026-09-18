import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { BrowserJsError } from '@/api/artifactApi';
import { useActiveRunStore } from '@/stores/useActiveRunStore';

// Moved to the api layer — it is the repair endpoint's body shape — and re-exported
// here so the panes that report and read offers keep one import for offer + error.
export type { BrowserJsError } from '@/api/artifactApi';

/** `files-expired` is terminal in a way `failed` is not: the data the artifact was built
 *  from has been deleted, so another attempt cannot succeed. */
export type RepairStatus = 'pending' | 'repairing' | 'failed' | 'files-expired';

export interface RepairOffer {
  artifactId: string;
  errors: BrowserJsError[];
  status: RepairStatus;
  /** The backend's own sentence about why a repair failed, when it gave one. Shown
   *  under the generic "did not succeed" line — the reader deciding whether to retry
   *  deserves the reason the server actually stated. */
  failureMessage?: string;
}

type QueuedOffer = Pick<RepairOffer, 'artifactId' | 'errors'>;

/** An artifact that threw while running, and what the user has decided about it.
 *
 *  The error surfaces in the Artifact pane and the offer to fix it belongs in the
 *  thread — those are sibling panes, so this is what crosses between them.
 *
 *  One offer is shown at a time, but a second artifact that breaks while the first is
 *  still on screen is **queued**, not dropped: the error event fires once (the artifact
 *  postMessages on throw), so a dropped report is a broken artifact with no way to
 *  offer a fix. Resolving or dismissing the current offer promotes the next in line.
 *
 *  The one report that IS dropped is the one that arrives while a run is open. The
 *  conversation in progress wins: whatever the pane is showing mid-run is either the
 *  half-written artifact the run is still producing, or the one the run is about to
 *  replace, and an offer to repair either would be an interruption about something
 *  already being dealt with. Dropped, not queued — by the time the run ends the
 *  artifact it was about is not the one on screen (ADR-0015 §run-in-progress-wins).
 *
 *  Every mutation that targets a specific artifact carries its id and no-ops if the
 *  current offer is not that artifact — a repair for A that resolves while the user has
 *  switched to C must not touch C's offer.
 */
interface RepairOfferState {
  offer: RepairOffer | null;
  /** Broken artifacts waiting behind the current offer, in arrival order. */
  queue: QueuedOffer[];
  /** Artifacts the user told us to leave alone. Not offered again this session. */
  dismissed: string[];
  report: (artifactId: string, errors: BrowserJsError[]) => void;
  /** Moves the current offer's status; ignored unless the offer is for `artifactId`. */
  setStatus: (artifactId: string, status: RepairStatus, failureMessage?: string) => void;
  /** The repair for `artifactId` finished; drop its offer and promote the next queued
   *  one. Ignored unless the current offer is for `artifactId`. */
  resolve: (artifactId: string) => void;
  /** The user waved the current offer off; remember it and promote the next queued one. */
  dismiss: () => void;
  /** Drops the current offer and everything queued — used on session change, since an
   *  offer and its queue belong to the artifacts of the session that produced them.
   *  Leaves `dismissed` (a per-tab "leave alone" list) intact. */
  reset: () => void;
}

/** Pulls the next not-yet-dismissed offer from the queue as the new current offer. */
const promoteNext = (queue: QueuedOffer[], dismissed: string[]): Partial<RepairOfferState> => {
  const nextIndex = queue.findIndex((item) => !dismissed.includes(item.artifactId));
  if (nextIndex === -1) {
    return { offer: null, queue: [] };
  }
  const next = queue[nextIndex];
  return {
    offer: { artifactId: next.artifactId, errors: next.errors, status: 'pending' },
    queue: queue.slice(nextIndex + 1),
  };
};

export const useRepairOfferStore = create<RepairOfferState>()(
  devtools(
    (set, get) => ({
      offer: null,
      queue: [],
      dismissed: [],

      report: (artifactId, errors) => {
        const { offer, queue, dismissed } = get();
        // Never for something already waved off, or an empty error batch.
        if (dismissed.includes(artifactId) || errors.length === 0) {
          return;
        }
        // Never while the agent is answering: the run in progress wins (see above).
        if (useActiveRunStore.getState().isRunStreaming) {
          return;
        }
        // Already the current offer, or already waiting: one report per artifact.
        if (offer?.artifactId === artifactId || queue.some((q) => q.artifactId === artifactId)) {
          return;
        }
        if (offer === null) {
          set({ offer: { artifactId, errors, status: 'pending' } }, false, 'report');
          return;
        }
        set({ queue: [...queue, { artifactId, errors }] }, false, 'report:queue');
      },

      setStatus: (artifactId, status, failureMessage) =>
        set(
          (state) =>
            state.offer?.artifactId === artifactId ? { offer: { ...state.offer, status, failureMessage } } : state,
          false,
          'setStatus'
        ),

      resolve: (artifactId) =>
        set(
          (state) => (state.offer?.artifactId === artifactId ? promoteNext(state.queue, state.dismissed) : state),
          false,
          'resolve'
        ),

      dismiss: () =>
        set(
          (state) => {
            if (state.offer === null) {
              return state;
            }
            const dismissed = [...state.dismissed, state.offer.artifactId];
            return { dismissed, ...promoteNext(state.queue, dismissed) };
          },
          false,
          'dismiss'
        ),

      reset: () => set({ offer: null, queue: [] }, false, 'reset'),
    }),
    { name: 'RepairOffer' }
  )
);
