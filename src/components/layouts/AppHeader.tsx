import React, { useCallback, useRef, useState } from 'react';
import { Popover } from 'antd';
import { MoonOutlined, SunOutlined, UserOutlined } from '@ant-design/icons';

import EmployeeAvatar from '@/components/common/EmployeeAvatar';
import DefaultConnectorsPanel from '@/components/connectors/DefaultConnectorsPanel';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDefaultConnectors } from '@/hooks/useDefaultConnectors';
import { useFestival } from '@/hooks/useFestival';
import { useTranslations } from '@/i18n/useTranslations';
import { useFestiveStore } from '@/stores/useFestiveStore';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { useThemeStore } from '@/stores/useThemeStore';
import FestiveDecoration, { LuckyCap, PumpkinBehind, PumpkinTeeth, SantaHat } from './FestiveDecoration';

import styles from './AppHeader.module.css';

/** The header: the 56px bar across the top of every screen (CONTEXT.md). It names the
 *  app and holds the one entry to the interface's own preferences — language and theme —
 *  behind the avatar. Nothing in between: the design mockup draws no
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
 *  initial would be a value invented at runtime (ADR-0006).
 *
 *  Around a festival the bar dresses up (CONTEXT.md, 節慶裝飾): a small scene in the
 *  empty middle, and the avatar in a hat or, at Halloween, a pumpkin; the session rail
 *  echoes it (SessionRailFestive). The one thing on screen the design does not draw —
 *  recorded as a deliberate exception in ADR-0002 — and the one preference here that is
 *  not about the interface's language or colour: the third row switches it off for
 *  whoever would rather not. */
const AppHeader: React.FC = () => {
  const user = useCurrentUser();
  const t = useTranslations();

  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const setDarkMode = useThemeStore((state) => state.setDarkMode);

  const festiveEnabled = useFestiveStore((state) => state.enabled);
  const setFestiveEnabled = useFestiveStore((state) => state.setEnabled);

  // The same answer the session rail gets, so the two dress up and undress together.
  const festival = useFestival();

  const triggerRef = useRef<HTMLButtonElement>(null);

  const [open, setOpen] = useState(false);

  // The user's default sources (CONTEXT.md, 預設 Connectors) live with the other
  // preferences; the row shows how many and opens the same picker a conversation uses.
  const { ids: defaultConnectorIds } = useDefaultConnectors();
  const [defaultConnectorsOpen, setDefaultConnectorsOpen] = useState(false);
  const openDefaultConnectors = useCallback(() => {
    setOpen(false);
    setDefaultConnectorsOpen(true);
  }, []);
  const closeDefaultConnectors = useCallback(() => setDefaultConnectorsOpen(false), []);

  const toggleLanguage = useCallback(() => setLanguage(language === 'zh-TW' ? 'en' : 'zh-TW'), [language, setLanguage]);
  const toggleTheme = useCallback(() => setDarkMode(!isDarkMode), [isDarkMode, setDarkMode]);
  const toggleFestive = useCallback(() => setFestiveEnabled(!festiveEnabled), [festiveEnabled, setFestiveEnabled]);

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
      <button type="button" className={styles.row} onClick={toggleFestive}>
        <span className={styles.rowLabel}>{t.settings.festive}</span>
        <span className={styles.rowValue}>{festiveEnabled ? t.settings.festiveOn : t.settings.festiveOff}</span>
      </button>
      <button type="button" className={styles.row} onClick={openDefaultConnectors}>
        <span className={styles.rowLabel}>{t.settings.defaultConnectors}</span>
        <span className={styles.rowValue}>
          {defaultConnectorIds.length > 0
            ? t.settings.defaultConnectorsCount(defaultConnectorIds.length)
            : t.settings.defaultConnectorsNone}
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

      {festival !== null && <FestiveDecoration festival={festival} />}

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
            // Only when the avatar itself is dressed: Mid-Autumn leaves it alone.
            data-festival={festival !== null && festival !== 'midAutumn' ? festival : undefined}
            aria-label="Preferences"
            title="Preferences"
            aria-haspopup="dialog"
            aria-expanded={open}
            onKeyDown={handleKeyDown}
          >
            {festival === 'halloween' && <PumpkinBehind className={styles.pumpkinBehind} />}
            <span className={styles.face}>
              {user ? <EmployeeAvatar entry={user} size={32} tone="solid" /> : <UserOutlined aria-hidden />}
            </span>
            {festival === 'halloween' && <PumpkinTeeth className={styles.pumpkinTeeth} />}
            {festival === 'christmas' && <SantaHat className={styles.hat} />}
            {festival === 'lunarNewYear' && <LuckyCap className={styles.cap} />}
          </button>
        </Popover>
      </div>
      <DefaultConnectorsPanel open={defaultConnectorsOpen} onClose={closeDefaultConnectors} />
    </header>
  );
};

export default AppHeader;
