import { create } from 'zustand';

// Client UI state only (architecture.md): the transient "you just published an
// Artifact" feedback — the rail's coach highlight and the toast offering
// 前往 Artifacts / 知道了. Not persisted; dismissing clears both.
interface GenerateCoachState {
  isActive: boolean;
  start: () => void;
  dismiss: () => void;
}

export const useGenerateCoachStore = create<GenerateCoachState>((set) => ({
  isActive: false,
  start: () => set({ isActive: true }),
  dismiss: () => set({ isActive: false }),
}));
