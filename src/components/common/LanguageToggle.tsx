import { TranslationOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import React from 'react';

import { type Language, useLanguageStore } from '@/stores/useLanguageStore';

const NEXT: Record<Language, Language> = { 'zh-TW': 'en', en: 'zh-TW' };
/** What the button shows: the language it would switch *to*, which is what the user is
 *  looking for. Showing the current one reads as a label and gives no reason to press. */
const NEXT_LABEL: Record<Language, string> = { 'zh-TW': 'EN', en: '中' };

/** Sits beside ThemeToggle: language and theme are the same kind of thing — a preference
 *  of whoever is using this browser, belonging to no conversation — so they are found in
 *  the same place.
 *
 *  The label and the accessible name stay untranslated on purpose. A control for choosing
 *  a language has to be legible to someone who cannot read the language it is currently
 *  in, which is exactly the person reaching for it.
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
      icon={<TranslationOutlined />}
    >
      {NEXT_LABEL[language]}
    </Button>
  );
};

export default LanguageToggle;
