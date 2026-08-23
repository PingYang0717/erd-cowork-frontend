import {
  AppstoreOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';

import { SessionGroup, sortByRecency } from '@/features/session/components/SessionList';
import { useCreateSession } from '@/features/session/hooks/useSessionMutations';
import { useSessions } from '@/features/session/hooks/useSessions';
import { useSessionSelectionStore } from '@/features/session/store/useSessionSelectionStore';

import styles from './CollapsedSessionRail.module.css';

interface CollapsedSessionRailProps {
  onExpand: () => void;
}

export function CollapsedSessionRail({ onExpand }: CollapsedSessionRailProps) {
  const createSession = useCreateSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [flyoutPosition, setFlyoutPosition] = useState({ top: 0, left: 0 });
  const historyButtonRef = useRef<HTMLButtonElement>(null);

  const { data } = useSessions();
  const sessions = data ?? [];
  const pinned = sortByRecency(sessions.filter((session) => session.pinned));
  const recent = sortByRecency(sessions.filter((session) => !session.pinned));
  const selectedSessionId = useSessionSelectionStore((s) => s.selectedSessionId);
  const selectSession = useSessionSelectionStore((s) => s.selectSession);

  function handleSelectSession(id: string) {
    selectSession(id);
    setHistoryOpen(false);
    navigate('/cowork');
  }

  function handleNewChat() {
    createSession.mutate();
    navigate('/cowork');
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
        onClick={handleNewChat}
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
                  <span className={styles.flyoutHeaderTitle}>Chat history</span>
                  <button
                    type="button"
                    className={styles.flyoutNewChat}
                    onClick={handleNewChat}
                    title="New chat"
                    aria-label="New chat"
                  >
                    <PlusOutlined aria-hidden />
                  </button>
                </div>
                <div className={styles.flyoutBody}>
                  <SessionGroup
                    label="Pinned"
                    sessions={pinned}
                    selectedSessionId={selectedSessionId}
                    onSelect={handleSelectSession}
                  />
                  <SessionGroup
                    label="Recents"
                    sessions={recent}
                    selectedSessionId={selectedSessionId}
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
}
