import { SettingOutlined } from '@ant-design/icons';
import { Popover, Segmented } from 'antd';
import React, { useState } from 'react';

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
  const [open, setOpen] = useState(false);
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const panel = (
    <div className={styles.panel}>
      <div className={styles.row}>
        <span className={styles.rowLabel}>{t.settings.language}</span>
        <Segmented
          value={language}
          onChange={(value) => setLanguage(value as Language)}
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
          // The store owns a toggle rather than a setter, so this fires only on a real
          // change — picking the mode already in use would otherwise flip it away.
          onChange={(value) => {
            if ((value === 'dark') !== isDarkMode) {
              toggleTheme();
            }
          }}
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
      {/* aria-haspopup + aria-expanded: the trigger opens a panel, and a reader has to
          hear that — the same contract VersionSwitcher's trigger keeps (A-2). antd's
          Popover adds nothing to a custom child, so the button says it itself. */}
      {variant === 'rail' ? (
        <button
          type="button"
          className={styles.railEntry}
          aria-label="Settings"
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <SettingOutlined aria-hidden />
          <span className={styles.railEntryLabel}>{t.settings.title}</span>
        </button>
      ) : (
        <button
          type="button"
          className={styles.tile}
          aria-label="Settings"
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <SettingOutlined aria-hidden />
        </button>
      )}
    </Popover>
  );
};

export default SettingsMenu;
