import {
  AppstoreOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';

import SettingsMenu from '@/components/common/SettingsMenu';
import { useSessionGroups } from '@/hooks/useSessionGroups';
import { useTranslations } from '@/i18n/useTranslations';

import styles from './CollapsedSessionRail.module.css';
import { SessionGroup } from './SessionList';

interface CollapsedSessionRailProps {
  onExpand: () => void;
}

const CollapsedSessionRail: React.FC<CollapsedSessionRailProps> = ({ onExpand }) => {
  const t = useTranslations();
  const navigate = useNavigate();
  const location = useLocation();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [flyoutPosition, setFlyoutPosition] = useState({ top: 0, left: 0 });
  const historyButtonRef = useRef<HTMLButtonElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);

  const {
    pinned,
    recent,
    draftSessionId,
    selectedSessionId,
    selectAndNavigate,
    createAndNavigate,
  } = useSessionGroups();

  const handleSelectSession = (id: string) => {
    selectAndNavigate(id);
    closeHistory();
  };

  /** Closing must hand focus back to the button that opened it — a dialog that
   *  drops focus to <body> loses the keyboard user's place entirely (A-6). */
  const closeHistory = () => {
    setHistoryOpen(false);
    historyButtonRef.current?.focus();
  };

  // A dialog receives focus when it opens; without this the keyboard user is still
  // standing on the button behind the backdrop (A-6). Syncing focus — an external
  // system — is what useEffect is for.
  useEffect(() => {
    if (historyOpen) {
      flyoutRef.current?.focus();
    }
  }, [historyOpen]);

  /** The dialog keyboard contract: Escape closes and restores focus; Tab cycles
   *  within rather than escaping into the page behind the backdrop (A-6). */
  const handleFlyoutKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeHistory();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const focusable = flyoutRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const toggleHistory = () => {
    if (!historyOpen) {
      const rect = historyButtonRef.current?.getBoundingClientRect();
      if (rect) {
        setFlyoutPosition({ top: rect.top - 4, left: rect.right + 8 });
      }
    }
    setHistoryOpen((v) => !v);
  };

  return (
    <div className={styles.rail}>
      <button
        type="button"
        className={styles.iconTile}
        onClick={onExpand}
        title="Expand session list"
        aria-label="Expand session list"
      >
        <MenuUnfoldOutlined aria-hidden />
      </button>
      <div className={styles.divider} />
      <button
        type="button"
        className={styles.primaryTile}
        onClick={createAndNavigate}
        title="New chat"
        aria-label="New chat"
      >
        <PlusOutlined aria-hidden />
      </button>
      <button
        type="button"
        className={styles.iconTile}
        data-active={location.pathname === '/cowork/schedule'}
        onClick={() => navigate('/cowork/schedule')}
        title="Schedule"
        aria-label="Schedule"
      >
        <ClockCircleOutlined aria-hidden />
      </button>
      <button
        type="button"
        className={styles.iconTile}
        data-active={location.pathname === '/cowork/artifacts'}
        onClick={() => navigate('/cowork/artifacts')}
        title="Artifacts"
        aria-label="Artifacts"
      >
        <AppstoreOutlined aria-hidden />
      </button>
      <div className={styles.historyWrap}>
        <button
          ref={historyButtonRef}
          type="button"
          className={styles.iconTile}
          data-active={historyOpen}
          onClick={toggleHistory}
          title="Chat history"
          aria-label="Chat history"
          aria-expanded={historyOpen}
        >
          <HistoryOutlined aria-hidden />
        </button>
        {historyOpen &&
          createPortal(
            <>
              {/* Pointer-only click-catcher; the keyboard path is Escape on the
                  dialog itself. Hidden from the tree — it is not content. */}
              <div aria-hidden="true" className={styles.flyoutBackdrop} onClick={closeHistory} />
              <div
                ref={flyoutRef}
                className={styles.flyout}
                role="dialog"
                aria-modal="true"
                aria-label="Chat history"
                tabIndex={-1}
                style={{ top: flyoutPosition.top, left: flyoutPosition.left }}
                onKeyDown={handleFlyoutKeyDown}
              >
                <div className={styles.flyoutHeader}>
                  <HistoryOutlined aria-hidden className={styles.flyoutHeaderIcon} />
                  <span className={styles.flyoutHeaderTitle}>{t.session.chatHistory}</span>
                  <button
                    type="button"
                    className={styles.flyoutNewChat}
                    onClick={createAndNavigate}
                    title="New chat"
                    aria-label="New chat"
                  >
                    <PlusOutlined aria-hidden />
                  </button>
                </div>
                <div className={styles.flyoutBody}>
                  <SessionGroup
                    label={t.session.pinned}
                    sessions={pinned}
                    selectedSessionId={selectedSessionId}
                    onSelect={handleSelectSession}
                  />
                  <SessionGroup
                    label={t.session.recents}
                    sessions={recent}
                    selectedSessionId={selectedSessionId}
                    draftSessionId={draftSessionId}
                    onSelect={handleSelectSession}
                  />
                </div>
              </div>
            </>,
            document.body,
          )}
      </div>
      <div className={styles.railFooter}>
        <SettingsMenu variant="tile" />
      </div>
    </div>
  );
};

export default CollapsedSessionRail;
