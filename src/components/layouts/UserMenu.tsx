import React, { useCallback } from 'react';
import { Segmented } from 'antd';

import { useTranslations } from '@/i18n/useTranslations';
import { type Language, useLanguageStore } from '@/stores/useLanguageStore';
import { useThemeStore } from '@/stores/useThemeStore';

import styles from './UserMenu.module.css';

/** What the avatar opens: who you are, and the two preferences that belong to whoever is
 *  using this browser.
 *
 *  The identity is at the top because every right this app grants is decided by it —
 *  another person's session answers 404, not "forbidden". Two preference switches with no
 *  name above them leave the reader no way to confirm the account those rights are being
 *  decided for.
 *
 *  A `Segmented` per preference rather than a toggle: it names both options, so the
 *  current one is readable without knowing which way the control points. That matters
 *  most for language, where the reader may not be able to read the interface at all. */
interface UserMenuProps {
  name?: string;
  department?: string;
  onDismiss: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ name, department, onDismiss }) => {
  const t = useTranslations();

  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const setDarkMode = useThemeStore((state) => state.setDarkMode);

  const handleThemeChange = useCallback((value: string | number) => setDarkMode(value === 'dark'), [setDarkMode]);
  const handleLanguageChange = useCallback((value: string | number) => setLanguage(value as Language), [setLanguage]);

  /** The dialog keyboard contract this repo adopted (ADR-0014 §menu-keyboard/§dialog-focus):
   *  Escape closes and puts focus back on the opener. antd's Popover does neither for a
   *  custom child, so the panel carries it. */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onDismiss();
      }
    },
    [onDismiss]
  );

  return (
    <div className={styles.panel} onKeyDown={handleKeyDown}>
      {name && (
        <div className={styles.identity}>
          <span className={styles.name}>{name}</span>
          {department && <span className={styles.department}>{department}</span>}
        </div>
      )}

      <div className={styles.row}>
        <span className={styles.rowLabel}>{t.settings.language}</span>
        <Segmented
          value={language}
          onChange={handleLanguageChange}
          options={[
            { label: t.settings.languageZh, value: 'zh' },
            { label: t.settings.languageEn, value: 'en' },
          ]}
          block
        />
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>{t.settings.theme}</span>
        <Segmented
          value={isDarkMode ? 'dark' : 'light'}
          onChange={handleThemeChange}
          options={[
            { label: t.settings.themeLight, value: 'light' },
            { label: t.settings.themeDark, value: 'dark' },
          ]}
          block
        />
      </div>
    </div>
  );
};

export default UserMenu;
