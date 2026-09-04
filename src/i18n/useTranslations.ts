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
export const useTranslations = (): Translations => {
  const language = useLanguageStore((state) => state.language);
  return DICTIONARIES[language] ?? zhTW;
};

/** The same copy, for code that is not a component — validators, error describers, the
 *  stream's own messages. They are plain functions called at the moment something
 *  happens, so they read the language then rather than subscribing to it: there is no
 *  render to re-run, and the string they return is used immediately. */
export const getTranslations = (): Translations => {
  return DICTIONARIES[useLanguageStore.getState().language] ?? zhTW;
};
