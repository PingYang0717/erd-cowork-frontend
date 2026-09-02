import { TranslationOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import React from 'react';

import { type Language, useLanguageStore } from '@/stores/useLanguageStore';

const NEXT: Record<Language, Language> = { 'zh-TW': 'en', en: 'zh-TW' };

/** Sits beside ThemeToggle and matches it: a circular text button carrying one icon.
 *
 *  Unlike the theme's sun and moon, there is no icon pair that reads as "Chinese" and
 *  "English", so the glyph stays put and the accessible name carries the destination.
 *  That name is the one thing here that is not translated — a control for choosing a
 *  language has to be legible to someone who cannot read the language it is currently in,
 *  which is exactly the person reaching for it.
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
    />
  );
};

export default LanguageToggle;
