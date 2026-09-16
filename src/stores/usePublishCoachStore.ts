import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/** How long the Gallery frames the Artifact that was just published before the frame
 *  goes away on its own. Long enough to find it, short enough that it is a moment and
 *  not a state. */
export const FRESH_HIGHLIGHT_MS = 6000;

// Client UI state only (architecture.md): the transient "you just published an
// Artifact" feedback — the rail's coach ring, the card hung off it offering
// 前往 Artifacts / 知道了, and the frame the Gallery draws around that Artifact when the
// user gets there. Not persisted.
//
// Two lifetimes, on purpose. The coach (`isActive`) is asking the user to go to the
// Gallery, and ends when they do or wave it off. Which Artifact was published outlives
// that: someone who pressed 知道了 and wanders over later still deserves to have it
// pointed out once. The Gallery is what ends it (`settle`), after it has been shown.
interface PublishCoachState {
  isActive: boolean;
  /** The Artifact just published; what the Gallery frames on arrival. */
  publishedArtifactId: string | null;
  start: (artifactId: string) => void;
  /** Ends the coach ring and the card; leaves `publishedArtifactId` for the Gallery. */
  dismiss: () => void;
  /** The Gallery has framed the Artifact for long enough. */
  settle: () => void;
}

export const usePublishCoachStore = create<PublishCoachState>()(
  devtools(
    (set) => ({
      isActive: false,
      publishedArtifactId: null,
      start: (artifactId) => set({ isActive: true, publishedArtifactId: artifactId }, false, 'start'),
      dismiss: () => set({ isActive: false }, false, 'dismiss'),
      settle: () => set({ publishedArtifactId: null }, false, 'settle'),
    }),
    { name: 'PublishCoach' }
  )
);
