import { create } from 'zustand';

interface SessionSelectionState {
  selectedSessionId: string | null;
  selectSession: (id: string) => void;
}

export const useSessionSelectionStore = create<SessionSelectionState>((set) => ({
  selectedSessionId: null,
  selectSession: (id) => set({ selectedSessionId: id }),
}));
