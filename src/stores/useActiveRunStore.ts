import { create } from 'zustand';

export interface StreamedArtifact {
  artifactId: string;
  title: string;
}

/** The slice of the current run that other panes need.
 *
 *  The run's own state (tokens, thinking, steps) stays in `useAgentStream`'s reducer —
 *  it is a transitional state that has not become API data yet, so it does not belong
 *  in TanStack Query, and it is nobody else's business either. Only what genuinely
 *  crosses panes lives here: the Artifact pane needs to swap to whatever the run just
 *  produced (title included, so it can appear in the version menu before the history
 *  refetch lands), and the thread needs to know which artifact is on display so a
 *  follow-up question can build on it (`baseArtifactId`).
 */
interface ActiveRunState {
  /** Artifact produced by the run in progress; null when no run has produced one. */
  streamedArtifact: StreamedArtifact | null;
  setStreamedArtifact: (artifact: StreamedArtifact | null) => void;
  /** Artifact the Artifact pane is currently showing; the thread sends it as
   *  baseArtifactId so the backend iterates on what the user is looking at. */
  displayedArtifactId: string | null;
  setDisplayedArtifactId: (artifactId: string | null) => void;
  /** Bumped to throw the artifact's document away and mount a fresh one. Two callers
   *  share it and neither can see the other: the panel's own Reload button, and a
   *  repair that finished in the thread. Lives here because that is the only channel
   *  those two trees have (ADR-0001). */
  artifactReloadNonce: number;
  bumpArtifactReload: () => void;
}

export const useActiveRunStore = create<ActiveRunState>((set) => ({
  streamedArtifact: null,
  setStreamedArtifact: (streamedArtifact) => set({ streamedArtifact }),
  displayedArtifactId: null,
  setDisplayedArtifactId: (displayedArtifactId) => set({ displayedArtifactId }),
  artifactReloadNonce: 0,
  bumpArtifactReload: () =>
    set((state) => ({ artifactReloadNonce: state.artifactReloadNonce + 1 })),
}));
