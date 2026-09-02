import { Button } from 'antd';
import React from 'react';

import { type Language, useLanguageStore } from '@/stores/useLanguageStore';

import styles from './LanguageToggle.module.css';

const NEXT: Record<Language, Language> = { 'zh-TW': 'en', en: 'zh-TW' };

/** What the button shows: the language it switches *to*. Same convention as the theme
 *  button beside it, which shows a sun while the app is dark — a control is labelled by
 *  what pressing it does, not by where you already are. */
const NEXT_GLYPH: Record<Language, string> = { 'zh-TW': 'EN', en: '中' };

/** Sits beside ThemeToggle and matches it: a circular text button carrying one glyph.
 *
 *  The glyph is lettering rather than a picture. There is no drawing that reads as
 *  "English" — a globe or a speech bubble says "language" without saying which one, and
 *  the point of pressing this is which one. `EN` and `中` say it in the one alphabet each
 *  reader is guaranteed to recognise.
 *
 *  The accessible name is the only string here left untranslated: whoever is reaching for
 *  this control is, by definition, the person who cannot read the language it is in.
 */
const LanguageToggle: React.FC = () => {
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  return (
    <Button
      type="text"
      shape="circle"
      onClick={() => setLanguage(NEXT[language])}
      title="Switch language / 切換語言"
      aria-label={language === 'zh-TW' ? 'Switch to English' : '切換為中文'}
      icon={
        <span aria-hidden className={styles.glyph}>
          {NEXT_GLYPH[language]}
        </span>
      }
    />
  );
};

export default LanguageToggle;
