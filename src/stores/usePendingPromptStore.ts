import { create } from 'zustand';

export interface PendingPrompt {
  question: string;
  baseArtifactId?: string;
}

type PromptSender = (prompt: PendingPrompt) => void;

interface PendingPromptState {
  /** The mounted thread's send pipeline; null while no thread is on screen. */
  sendPrompt: PromptSender | null;
  register: (sender: PromptSender) => void;
  unregister: (sender: PromptSender) => void;
}

/** Cross-panel channel: the Artifact panel pushes a prompt into the thread's send
 *  pipeline — the mockup's regenerate button sends a chat message (cwRegen), carrying
 *  the artifact on display as baseArtifactId so the run iterates on it. The thread
 *  registers its sender on mount rather than the panel queueing state, so sending is
 *  a plain event-handler call. */
export const usePendingPromptStore = create<PendingPromptState>((set) => ({
  sendPrompt: null,
  register: (sender) => set({ sendPrompt: sender }),
  unregister: (sender) =>
    set((state) => (state.sendPrompt === sender ? { sendPrompt: null } : state)),
}));
