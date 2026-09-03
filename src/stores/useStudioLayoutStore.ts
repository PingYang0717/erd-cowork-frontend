import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { STUDIO_LAYOUT_STORAGE_KEY } from '@/constants/storage';
import { clamp } from '@/utils/clamp';

export const SESSION_RAIL_MIN_WIDTH = 200;
export const SESSION_RAIL_MAX_WIDTH = 460;
export const SESSION_RAIL_DEFAULT_WIDTH = 270;
export const SESSION_RAIL_COLLAPSED_WIDTH = 52;

export const THREAD_MIN_WIDTH = 320;
export const THREAD_MAX_WIDTH = 720;
export const THREAD_DEFAULT_WIDTH = 430;

interface StudioLayoutState {
  sessionRailWidth: number;
  threadWidth: number;
  isSessionRailCollapsed: boolean;
  setSessionRailWidth: (width: number) => void;
  setThreadWidth: (width: number) => void;
  toggleSessionRailCollapsed: () => void;
}

export const useStudioLayoutStore = create<StudioLayoutState>()(
  // devtools outermost so the log shows the value persist has already applied,
  // matching the theme and language stores.
  devtools(
    persist(
      (set) => ({
        sessionRailWidth: SESSION_RAIL_DEFAULT_WIDTH,
        threadWidth: THREAD_DEFAULT_WIDTH,
        isSessionRailCollapsed: false,
        setSessionRailWidth: (width) =>
          set(
            { sessionRailWidth: clamp(width, SESSION_RAIL_MIN_WIDTH, SESSION_RAIL_MAX_WIDTH) },
            false,
            'setSessionRailWidth',
          ),
        setThreadWidth: (width) =>
          set(
            { threadWidth: clamp(width, THREAD_MIN_WIDTH, THREAD_MAX_WIDTH) },
            false,
            'setThreadWidth',
          ),
        toggleSessionRailCollapsed: () =>
          set(
            (state) => ({ isSessionRailCollapsed: !state.isSessionRailCollapsed }),
            false,
            'toggleSessionRailCollapsed',
          ),
      }),
      { name: STUDIO_LAYOUT_STORAGE_KEY },
    ),
    { name: 'StudioLayout' },
  ),
);
