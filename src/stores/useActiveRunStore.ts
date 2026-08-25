import { create } from 'zustand';

/** The slice of the current run that other panes need.
 *
 *  The run's own state (tokens, thinking, steps) stays in `useAgentStream`'s reducer —
 *  it is a transitional state that has not become API data yet, so it does not belong
 *  in TanStack Query, and it is nobody else's business either. Only what genuinely
 *  crosses panes lives here: the Artifact pane needs to swap to whatever the run just
 *  produced, without waiting for the thread's history to refetch.
 */
interface ActiveRunState {
  /** Artifact produced by the run in progress; null when no run has produced one. */
  streamedArtifactId: string | null;
  setStreamedArtifactId: (artifactId: string | null) => void;
}

export const useActiveRunStore = create<ActiveRunState>((set) => ({
  streamedArtifactId: null,
  setStreamedArtifactId: (streamedArtifactId) => set({ streamedArtifactId }),
}));
