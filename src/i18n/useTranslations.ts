import { useLanguageStore } from '@/stores/useLanguageStore';

import { en } from './en';
import { type Translations, zhTW } from './zhTW';

const DICTIONARIES: Record<string, Translations> = { 'zh-TW': zhTW, en };

/** The copy for the language currently selected.
 *
 *  Returns the dictionary itself rather than a lookup function: `t.share.copied` is
 *  checked by the compiler all the way down, so a renamed key breaks the build at every
 *  call site instead of rendering as a missing-key placeholder at runtime.
 */
export function useTranslations(): Translations {
  const language = useLanguageStore((state) => state.language);
  return DICTIONARIES[language] ?? zhTW;
}
