import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { THEME_STORAGE_KEY } from '@/constants/storage';

interface ThemeState {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  // devtools outermost so the DevTools log shows the state persist has already applied,
  // not the pre-rehydration value.
  devtools(
    persist(
      (set) => ({
        isDarkMode: false,
        toggleTheme: () =>
          set((state) => ({ isDarkMode: !state.isDarkMode }), false, 'toggleTheme'),
      }),
      { name: THEME_STORAGE_KEY },
    ),
    { name: 'Theme' },
  ),
);
