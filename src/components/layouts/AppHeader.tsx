import React, { useCallback, useRef, useState } from 'react';
import { Popover } from 'antd';
import { MoonOutlined, SunOutlined, UserOutlined } from '@ant-design/icons';

import EmployeeAvatar from '@/components/common/EmployeeAvatar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useTranslations } from '@/i18n/useTranslations';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { useThemeStore } from '@/stores/useThemeStore';

import styles from './AppHeader.module.css';

/** The header: the 56px bar across the top of every screen (CONTEXT.md). It names the
 *  app and holds the one entry to the interface's own preferences — language and theme —
 *  behind the avatar. Nothing in between: the design (erd-cowork.html) draws no
 *  navigation, search or notifications here.
 *
 *  The preferences used to be a Settings entry at the foot of the session rail, with a
 *  copy on the failure card and another on the full-page Artifact view so the language
 *  exit survived every failure that hid the rail. The header sits above every route and
 *  outside every pane boundary, so one entry is enough and the copies are gone.
 *
 *  Two rows that toggle on press rather than a control naming both options: the design
 *  draws it that way, and each row shows what is in use — `EN` / `中`, `Light` / `Dark`.
 *
 *  The avatar is the signed-in user as the HR directory knows them (`GET /hr/userInfo`,
 *  asked once at start): their photo, or their initial when there is no photo to fetch —
 *  drawn by the same component as a share recipient. Until the profile answers, or if it
 *  never does, a generic figure stands in: the design hard-codes `KL`, but a made-up
 *  initial would be a value invented at runtime (ADR-0006). */
const AppHeader: React.FC = () => {
  const user = useCurrentUser();
  const t = useTranslations();

  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const setDarkMode = useThemeStore((state) => state.setDarkMode);

  const triggerRef = useRef<HTMLButtonElement>(null);

  const [open, setOpen] = useState(false);

  const toggleLanguage = useCallback(() => setLanguage(language === 'zh-TW' ? 'en' : 'zh-TW'), [language, setLanguage]);
  const toggleTheme = useCallback(() => setDarkMode(!isDarkMode), [isDarkMode, setDarkMode]);

  /** The dialog keyboard contract this repo adopted (ADR-0014 §menu-keyboard/§dialog-focus):
   *  Escape closes and puts focus back on the opener. antd's Popover does neither for a
   *  custom child, so the panel and the trigger both carry it. */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }, []);

  const panel = (
    <div className={styles.panel} onKeyDown={handleKeyDown}>
      <button type="button" className={styles.row} onClick={toggleLanguage}>
        <span className={styles.rowLabel}>{t.settings.language}</span>
        <span className={styles.rowValue}>{language === 'zh-TW' ? t.settings.languageZh : t.settings.languageEn}</span>
      </button>
      <button type="button" className={styles.row} onClick={toggleTheme}>
        <span className={styles.rowLabel}>{t.settings.theme}</span>
        <span className={styles.rowValue}>
          {isDarkMode ? <MoonOutlined aria-hidden /> : <SunOutlined aria-hidden />}
          {isDarkMode ? t.settings.themeDark : t.settings.themeLight}
        </span>
      </button>
    </div>
  );

  return (
    <header className={styles.header} aria-label="App header">
      <div className={styles.brand}>
        <span className={styles.logo} aria-hidden>
          eRD
        </span>
        <div>
          {/* Brand, not copy: the product's name and its line, the same in both languages. */}
          <div className={styles.name}>eRD Cowork</div>
          <div className={styles.tagline}>R&amp;D platform</div>
        </div>
      </div>

      <div className={styles.actions}>
        <Popover
          open={open}
          onOpenChange={setOpen}
          trigger="click"
          placement="bottomRight"
          arrow={false}
          content={panel}
          styles={{ container: { padding: 5, borderRadius: 10, minWidth: 196 } }}
        >
          {/* aria-haspopup + aria-expanded because a reader has to hear that this opens
              a panel — antd adds nothing to a custom child (ADR-0014 §menu-keyboard). */}
          <button
            ref={triggerRef}
            type="button"
            className={styles.avatar}
            aria-label="Preferences"
            title="Preferences"
            aria-haspopup="dialog"
            aria-expanded={open}
            onKeyDown={handleKeyDown}
          >
            {user ? <EmployeeAvatar entry={user} size={32} tone="solid" /> : <UserOutlined aria-hidden />}
          </button>
        </Popover>
      </div>
    </header>
  );
};

export default AppHeader;
