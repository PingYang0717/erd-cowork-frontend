import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { FESTIVE_STORAGE_KEY } from '@/constants/storage';

interface FestiveState {
  /** Whether the header dresses up for festivals (CONTEXT.md, 節慶裝飾). */
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

/** The festive decoration's switch. Lives with the other interface preferences — the
 *  avatar menu's rows — and persists like them, so a reader who turned it off stays
 *  undecorated after a reload. On by default: the decoration is the point of the season,
 *  and the switch is for whoever would rather not. */
export const useFestiveStore = create<FestiveState>()(
  devtools(
    persist(
      (set) => ({
        enabled: true,
        setEnabled: (enabled) => set({ enabled }, false, 'setEnabled'),
      }),
      { name: FESTIVE_STORAGE_KEY }
    ),
    { name: 'Festive' }
  )
);
