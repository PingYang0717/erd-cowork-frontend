import React, { useCallback, useRef, useState } from 'react';
import { Popover, Segmented } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

import { useTranslations } from '@/i18n/useTranslations';
import { type Language, useLanguageStore } from '@/stores/useLanguageStore';
import { useThemeStore } from '@/stores/useThemeStore';

import styles from './SettingsMenu.module.css';

/** Where the interface's own preferences live: language and theme.
 *
 *  One entry instead of two loose toggles. The pair used to sit in the thread header and
 *  again in the full-page Artifact view — the same two controls, duplicated, and taking
 *  up header room next to things that act on the conversation rather than on the app.
 *  Preferences belong to whoever is using this browser, so they are found where the app's
 *  own navigation is rather than beside the work.
 *
 *  A `Segmented` per preference rather than a toggle: it names both options, so the
 *  current one is readable without knowing which way the control points. That mattered
 *  most for language, where the reader may not be able to read the interface at all.
 */
interface SettingsMenuProps {
  /** `rail` is the expanded sidebar's labelled row; `tile` is the collapsed rail's icon. */
  variant: 'rail' | 'tile';
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ variant }) => {
  const t = useTranslations();
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const setDarkMode = useThemeStore((state) => state.setDarkMode);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleLanguageChange = useCallback((value: string | number) => setLanguage(value as Language), [setLanguage]);
  const handleThemeChange = useCallback((value: string | number) => setDarkMode(value === 'dark'), [setDarkMode]);
  /** The dialog keyboard contract this repo adopted (A-2/A-6): Escape closes and puts
   *  focus back on the opener. antd's Popover does neither for a custom child, so the
   *  panel and the trigger both carry it. */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }, []);

  const panel = (
    <div className={styles.panel} onKeyDown={handleKeyDown}>
      <div className={styles.row}>
        <span className={styles.rowLabel}>{t.settings.language}</span>
        <Segmented
          value={language}
          onChange={handleLanguageChange}
          options={[
            { value: 'zh-TW', label: t.settings.languageZh },
            { value: 'en', label: t.settings.languageEn },
          ]}
        />
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>{t.settings.theme}</span>
        <Segmented
          value={isDarkMode ? 'dark' : 'light'}
          onChange={handleThemeChange}
          options={[
            { value: 'light', label: t.settings.themeLight },
            { value: 'dark', label: t.settings.themeDark },
          ]}
        />
      </div>
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement={variant === 'rail' ? 'topLeft' : 'right'}
      title={t.settings.title}
      content={panel}
    >
      {/* One button, not one per variant: the pair used to duplicate every attribute
          and drift was only a matter of time. aria-haspopup + aria-expanded because a
          reader has to hear that this opens a panel — antd adds nothing to a custom
          child (the same contract VersionSwitcher's trigger keeps, A-2). */}
      <button
        ref={triggerRef}
        type="button"
        className={variant === 'rail' ? styles.railEntry : styles.tile}
        aria-label="Settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        onKeyDown={handleKeyDown}
      >
        <SettingOutlined aria-hidden />
        {variant === 'rail' && <span className={styles.railEntryLabel}>{t.settings.title}</span>}
      </button>
    </Popover>
  );
};

export default SettingsMenu;
