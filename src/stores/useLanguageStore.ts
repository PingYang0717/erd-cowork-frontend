import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type Language = 'zh-TW' | 'en';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

/** Which language the interface speaks. A preference of this browser's user, like the
 *  theme beside it — not state of any one conversation, so it is persisted rather than
 *  carried in a URL or asked for again each visit.
 *
 *  Starts on Chinese rather than reading `navigator.language`: this is an internal tool
 *  for one company's engineers, and deriving it from the OS would open the same machine
 *  into different interfaces depending on a setting nobody set for this purpose.
 */
export const useLanguageStore = create<LanguageState>()(
  // devtools outermost so the log shows the value persist has already applied, matching
  // how the theme store is wired.
  devtools(
    persist(
      (set) => ({
        language: 'zh-TW',
        setLanguage: (language) => set({ language }, false, 'setLanguage'),
      }),
      { name: 'language-storage' },
    ),
    { name: 'Language' },
  ),
);
