import {
  AppstoreOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';

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

  const {
    pinned,
    recent,
    draftSessionId,
    selectedSessionId,
    selectAndNavigate,
    createAndNavigate,
  } = useSessionGroups();

  function handleSelectSession(id: string) {
    selectAndNavigate(id);
    setHistoryOpen(false);
  }

  function toggleHistory() {
    if (!historyOpen) {
      const rect = historyButtonRef.current?.getBoundingClientRect();
      if (rect) {
        setFlyoutPosition({ top: rect.top - 4, left: rect.right + 8 });
      }
    }
    setHistoryOpen((v) => !v);
  }

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
              <div className={styles.flyoutBackdrop} onClick={() => setHistoryOpen(false)} />
              <div
                className={styles.flyout}
                role="dialog"
                aria-label="Chat history"
                style={{ top: flyoutPosition.top, left: flyoutPosition.left }}
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
    </div>
  );
};

export default CollapsedSessionRail;
