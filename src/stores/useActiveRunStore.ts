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
 *  refetch lands), the thread needs to know which artifact is on display so a
 *  follow-up question can build on it (`baseArtifactId`), and the thread's Artifact
 *  chips need to be able to put an earlier one back on the pane.
 */
interface ActiveRunState {
  /** Artifact produced by the run in progress; null when no run has produced one. */
  streamedArtifact: StreamedArtifact | null;
  setStreamedArtifact: (artifact: StreamedArtifact | null) => void;
  /** Which artifact the pane was told to show — by the version menu, or by a past
   *  reply's chip in the thread. Null means "follow the run, else the newest". */
  pickedArtifactId: string | null;
  pickArtifact: (artifactId: string) => void;
  clearPickedArtifact: () => void;
  /** Artifact the Artifact pane is currently showing; the thread sends it as
   *  baseArtifactId so the backend iterates on what the user is looking at. */
  displayedArtifactId: string | null;
  setDisplayedArtifactId: (artifactId: string | null) => void;
}

export const useActiveRunStore = create<ActiveRunState>((set) => ({
  streamedArtifact: null,
  // A newly produced artifact takes over ONCE (the user asked for it), so producing one
  // drops the pick; after that a pick wins again. Clearing on null instead would wipe
  // the pick every time a run merely starts or the thread unmounts.
  setStreamedArtifact: (streamedArtifact) =>
    set(
      streamedArtifact === null
        ? { streamedArtifact }
        : { streamedArtifact, pickedArtifactId: null },
    ),
  pickedArtifactId: null,
  pickArtifact: (pickedArtifactId) => set({ pickedArtifactId }),
  clearPickedArtifact: () => set({ pickedArtifactId: null }),
  displayedArtifactId: null,
  setDisplayedArtifactId: (displayedArtifactId) => set({ displayedArtifactId }),
}));
