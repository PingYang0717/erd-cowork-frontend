import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { THEME_STORAGE_KEY } from '@/constants/storage';

interface ThemeState {
  isDarkMode: boolean;
  /** A setter, not a toggle: the only consumer is a Segmented that names both modes,
   *  and adapting a set-control to a toggle needed a guard against re-picking the
   *  current mode flipping it away. */
  setDarkMode: (isDarkMode: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  // devtools outermost so the DevTools log shows the state persist has already applied,
  // not the pre-rehydration value.
  devtools(
    persist(
      (set) => ({
        isDarkMode: false,
        setDarkMode: (isDarkMode) => set({ isDarkMode }, false, 'setDarkMode'),
      }),
      { name: THEME_STORAGE_KEY }
    ),
    { name: 'Theme' }
  )
);
