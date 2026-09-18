import React, { useState } from 'react';
import { Button } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppstoreOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  MenuFoldOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';

import { FestiveFloor } from '@/components/layouts/FestiveSurfaces';
import { useFestival } from '@/hooks/useFestival';
import { useSessionGroups } from '@/hooks/useSessionGroups';
import { useTranslations } from '@/i18n/useTranslations';
import { usePublishCoachStore } from '@/stores/usePublishCoachStore';
import type { Session } from '@/types/api/session';
import { FestiveString } from './SessionRailFestive';
import SessionRow from './SessionRow';

import styles from './SessionList.module.css';

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

/** The mockup's post-publish notice: a small card hung off the right of the Artifacts
 *  entry, pointing at it, saying where the Artifact went and offering the jump. It lives
 *  here rather than in the Artifact pane because it is about this entry — the coach ring
 *  on the row and the card share one state and clear together. The collapsed rail does
 *  not show it, as the mockup's does not either. */
const PublishedFlyout: React.FC = () => {
  const t = useTranslations();
  const navigate = useNavigate();
  const dismiss = usePublishCoachStore((s) => s.dismiss);

  return (
    <div role="status" aria-label="Artifact published" className={styles.publishedFlyout}>
      <span className={styles.publishedFlyoutArrow} aria-hidden="true" />
      <div className={styles.publishedFlyoutHead}>
        <span className={styles.publishedFlyoutIcon} aria-hidden="true">
          <AppstoreOutlined />
        </span>
        <div className={styles.publishedFlyoutBody}>
          <div className={styles.publishedFlyoutTitle}>{t.artifact.publishedTitle}</div>
          <div className={styles.publishedFlyoutDetail}>{t.artifact.publishedDetail}</div>
        </div>
      </div>
      <div className={styles.publishedFlyoutActions}>
        <button
          type="button"
          className={styles.publishedFlyoutPrimary}
          onClick={() => {
            dismiss();
            navigate('/cowork/artifacts');
          }}
        >
          {t.artifact.goToArtifacts}
        </button>
        <button type="button" className={styles.publishedFlyoutDismiss} onClick={dismiss}>
          {t.common.gotIt}
        </button>
      </div>
    </div>
  );
};

const SessionList: React.FC<SessionListProps> = ({ onCollapse, artifactsCount }) => {
  const t = useTranslations();
  const navigate = useNavigate();
  const location = useLocation();
  const isCoaching = usePublishCoachStore((s) => s.isActive);
  // Around a festival the rail joins the header's scene in the two places the mockup
  // leaves empty: its own hung string (SessionRailFestive), and its stretch of the floor
  // every empty surface shares, with the weather coming down onto it (FestiveSurfaces).
  // Same switch and calendar as the header.
  const festival = useFestival();
  const { pinned, recent, draftSessionId, selectedSessionId, selectAndNavigate, createAndNavigate } =
    useSessionGroups();

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
            className={styles.collapseButton}
            icon={<MenuFoldOutlined aria-hidden />}
            onClick={onCollapse}
            title="Collapse session list"
            aria-label="Collapse session list"
          />
        )}
      </div>
      <nav className={styles.navShortcuts} aria-label="Shortcuts" data-festive={festival !== null ? 'true' : undefined}>
        {/* The flyout is a sibling, not a child: a button cannot contain buttons, and the
            entry's accessible name must stay "Artifacts" for the coach to be found by. */}
        <div className={styles.navShortcutAnchor}>
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
          {isCoaching && <PublishedFlyout />}
        </div>
        {/* Skills, as the mockup lists it under Artifacts. The page behind it is a
            placeholder for now; the entry is here so the rail already has its shape. */}
        <button
          type="button"
          className={styles.navShortcut}
          aria-current={location.pathname === '/cowork/skills' ? 'page' : undefined}
          onClick={() => navigate('/cowork/skills')}
        >
          <ThunderboltOutlined aria-hidden />
          <span className={styles.navShortcutLabel}>{t.session.skills}</span>
        </button>
        {festival !== null && <FestiveString festival={festival} />}
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
      {festival !== null && <FestiveFloor festival={festival} surface="rail" />}
    </div>
  );
};

export default SessionList;
