import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface SessionSelectionState {
  selectedSessionId: string | null;
  /** When the open draft was started, or null when the selection is a real session.
   *  One timestamp serves both the cache shell's `createdAt` and the rail entry's
   *  `updatedAt`, so the draft cannot disagree with itself about its own age. */
  draftStartedAt: string | null;
  selectSession: (id: string) => void;
  /** Opens a draft: a session id this client invented, which the backend will not know
   *  about until the first message upserts it (ADR-0005). */
  startDraft: (id: string, startedAt: string) => void;
  /** Nothing is open. Used when the open session stops existing — a deleted session
   *  whose id stayed selected would be re-created by the next message (ADR-0005
   *  upserts on send), so the user's delete would undo itself. */
  clearSelection: () => void;
}

export const useSessionSelectionStore = create<SessionSelectionState>()(
  devtools(
    (set) => ({
      selectedSessionId: null,
      draftStartedAt: null,
      // Selecting a DIFFERENT session abandons the draft — it holds nothing worth
      // keeping. Selecting the draft itself is not leaving it, but the timestamp is
      // cleared unconditionally anyway: a draft exists only by derivation ("the backend
      // has never heard of this selection"), so clearing it means clicking your own row
      // makes that row disappear.
      //
      // The other half of that (clear on selecting something else) has no test guarding
      // it, and could not have one: useSessionGroups also requires the selected id to be
      // absent from the sessions list, and once a real session is selected that condition
      // is already false — so a leftover timestamp makes no visible difference. It is
      // cleared here to keep the state self-consistent, not because the screen reads it.
      selectSession: (id) =>
        set(
          (state) => ({
            selectedSessionId: id,
            draftStartedAt: id === state.selectedSessionId ? state.draftStartedAt : null,
          }),
          false,
          'selectSession'
        ),
      startDraft: (id, startedAt) => set({ selectedSessionId: id, draftStartedAt: startedAt }, false, 'startDraft'),
      clearSelection: () => set({ selectedSessionId: null, draftStartedAt: null }, false, 'clearSelection'),
    }),
    { name: 'SessionSelection' }
  )
);
