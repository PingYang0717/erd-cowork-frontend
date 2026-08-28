import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Client UI state only (architecture.md): the transient "you just published an
// Artifact" feedback — the rail's coach highlight and the toast offering
// 前往 Artifacts / 知道了. Not persisted; dismissing clears both.
interface PublishCoachState {
  isActive: boolean;
  start: () => void;
  dismiss: () => void;
}

export const usePublishCoachStore = create<PublishCoachState>()(
  devtools(
    (set) => ({
      isActive: false,
      start: () => set({ isActive: true }, false, 'start'),
      dismiss: () => set({ isActive: false }, false, 'dismiss'),
    }),
    { name: 'PublishCoach' },
  ),
);
