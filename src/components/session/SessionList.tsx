import {
  AppstoreOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  ClockCircleOutlined,
  MenuFoldOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button } from 'antd';
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useSessionGroups } from '@/hooks/useSessionGroups';
import { useTranslations } from '@/i18n/useTranslations';
import { usePublishCoachStore } from '@/stores/usePublishCoachStore';
import type { Session } from '@/types/api/session';

import styles from './SessionList.module.css';
import SessionRow from './SessionRow';

export interface SessionGroupProps {
  label: string;
  sessions: Session[];
  selectedSessionId: string | null;
  /** The open draft, if any — the one row without a more-actions menu. */
  draftSessionId?: string | null;
  onSelect: (id: string) => void;
  /** When set, an empty group keeps its header and shows this line instead of vanishing. */
  emptyFallback?: string;
}

export const SessionGroup: React.FC<SessionGroupProps> = ({
  label,
  sessions,
  selectedSessionId,
  draftSessionId,
  onSelect,
  emptyFallback,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (sessions.length === 0 && !emptyFallback) {
    return null;
  }

  return (
    <section aria-label={`${label} sessions`}>
      <button
        type="button"
        className={styles.groupHeadingButton}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((v) => !v)}
      >
        {isExpanded ? (
          <CaretDownOutlined aria-hidden className={styles.groupHeadingChevron} />
        ) : (
          <CaretRightOutlined aria-hidden className={styles.groupHeadingChevron} />
        )}
        <h3 className={styles.groupHeading}>{label}</h3>
        <span className={styles.groupCount}>{sessions.length}</span>
      </button>
      {isExpanded &&
        (sessions.length === 0 ? (
          <p className={styles.groupEmpty}>{emptyFallback}</p>
        ) : (
          <ul className={styles.sessionGroupList}>
            {sessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                isSelected={session.id === selectedSessionId}
                isDraft={session.id === draftSessionId}
                onSelect={onSelect}
              />
            ))}
          </ul>
        ))}
    </section>
  );
};

interface SessionListProps {
  onCollapse?: () => void;
  artifactsCount?: number;
}

const SessionList: React.FC<SessionListProps> = ({ onCollapse, artifactsCount }) => {
  const t = useTranslations();
  const {
    pinned,
    recent,
    draftSessionId,
    selectedSessionId,
    selectAndNavigate,
    createAndNavigate,
  } = useSessionGroups();
  const navigate = useNavigate();
  const location = useLocation();
  const isCoaching = usePublishCoachStore((s) => s.isActive);

  return (
    <div className={styles.sessionList}>
      <div className={styles.topRow}>
        <Button
          type="primary"
          className={styles.newChatButton}
          style={{ flex: '1 1 auto', minWidth: 0 }}
          icon={<PlusOutlined aria-hidden />}
          onClick={createAndNavigate}
        >
          {t.session.newChat}
        </Button>
        {onCollapse && (
          <Button
            icon={<MenuFoldOutlined aria-hidden />}
            onClick={onCollapse}
            title="Collapse session list"
            aria-label="Collapse session list"
          />
        )}
      </div>
      <nav className={styles.navShortcuts} aria-label="Shortcuts">
        <button
          type="button"
          className={styles.navShortcut}
          aria-current={location.pathname === '/cowork/schedule' ? 'page' : undefined}
          onClick={() => navigate('/cowork/schedule')}
        >
          <ClockCircleOutlined aria-hidden />
          <span className={styles.navShortcutLabel}>{t.session.schedule}</span>
        </button>
        <button
          type="button"
          className={styles.navShortcut}
          aria-current={location.pathname === '/cowork/artifacts' ? 'page' : undefined}
          data-coach={isCoaching ? 'true' : undefined}
          onClick={() => navigate('/cowork/artifacts')}
        >
          <AppstoreOutlined aria-hidden />
          <span className={styles.navShortcutLabel}>{t.session.artifacts}</span>
          {artifactsCount != null && <span className={styles.countBadge}>{artifactsCount}</span>}
        </button>
      </nav>
      <div className={styles.scrollRegion} data-testid="session-scroll">
        <SessionGroup
          label={t.session.pinned}
          sessions={pinned}
          selectedSessionId={selectedSessionId}
          onSelect={selectAndNavigate}
        />
        <SessionGroup
          label={t.session.recents}
          sessions={recent}
          selectedSessionId={selectedSessionId}
          draftSessionId={draftSessionId}
          onSelect={selectAndNavigate}
          emptyFallback={t.session.noRecents}
        />
      </div>
    </div>
  );
};

export default SessionList;
