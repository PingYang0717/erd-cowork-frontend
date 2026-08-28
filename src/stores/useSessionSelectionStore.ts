import { create } from 'zustand';

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
}

export const useSessionSelectionStore = create<SessionSelectionState>((set) => ({
  selectedSessionId: null,
  draftStartedAt: null,
  //選走別的 session 就等於放棄這個草稿——它沒有任何東西需要保存。
  selectSession: (id) => set({ selectedSessionId: id, draftStartedAt: null }),
  startDraft: (id, startedAt) => set({ selectedSessionId: id, draftStartedAt: startedAt }),
}));
