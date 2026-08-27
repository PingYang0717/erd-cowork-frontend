import {
  AppstoreOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  MenuFoldOutlined,
  MoreOutlined,
  PlusOutlined,
  PushpinFilled,
  PushpinOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Input } from 'antd';
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useSessionGroups } from '@/hooks/useSessionGroups';
import {
  useDeleteSession,
  useRenameSession,
  useToggleSessionPin,
} from '@/hooks/useSessionMutations';
import { usePublishCoachStore } from '@/stores/usePublishCoachStore';
import type { Session } from '@/types/api/session';
import { dispatchMenuAction } from '@/utils/dispatchMenuAction';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

import styles from './SessionList.module.css';

function SessionRow({
  session,
  isSelected,
  isDraft,
  onSelect,
}: {
  session: Session;
  isSelected: boolean;
  /** A draft exists only in this client until its first message (ADR-0008). Rename,
   *  pin and delete have nothing to act on, so the row offers none of them. */
  isDraft: boolean;
  onSelect: (id: string) => void;
}) {
  const toggleSessionPin = useToggleSessionPin();
  const renameSession = useRenameSession();
  const deleteSession = useDeleteSession();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(session.title);
  const isPinned = session.pinnedAt !== null;

  // Dividers between every item, per the mockup's session menu. The Pin icon
  // deliberately keeps its filled-when-pinned variant (spec exception).
  //
  // All three are disabled: the backend has no rename, pin or delete for a session
  // Live against the backend: nothing here is disabled up front. An endpoint that has
  // not landed answers with an error the mutation toasts to the user instead.
  const menuItems = [
    {
      key: 'pin',
      label: isPinned ? 'Unpin' : 'Pin',
      icon: isPinned ? <PushpinFilled aria-hidden /> : <PushpinOutlined aria-hidden />,
    },
    { type: 'divider' as const },
    {
      key: 'rename',
      label: 'Rename',
      icon: <EditOutlined aria-hidden />,
    },
    { type: 'divider' as const },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      icon: <DeleteOutlined aria-hidden />,
    },
  ];

  function handleMenuClick(key: string) {
    dispatchMenuAction(key, {
      pin: () => toggleSessionPin.mutate(session.id),
      rename: () => {
        setRenameDraft(session.title);
        setIsRenaming(true);
      },
      delete: () => deleteSession.mutate(session.id),
    });
  }

  function commitRename() {
    const title = renameDraft.trim();
    setIsRenaming(false);
    if (title && title !== session.title) {
      renameSession.mutate({ id: session.id, title });
    }
  }

  function cancelRename() {
    setIsRenaming(false);
  }

  if (isRenaming) {
    return (
      <li className={styles.sessionRowContainer}>
        <Input
          className={styles.renameInput}
          autoFocus
          aria-label={`Rename ${session.title}`}
          value={renameDraft}
          onChange={(e) => setRenameDraft(e.target.value)}
          onPressEnter={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              cancelRename();
            }
          }}
          onBlur={commitRename}
        />
      </li>
    );
  }

  return (
    <li className={styles.sessionRowContainer}>
      <button
        type="button"
        className={styles.sessionRow}
        aria-current={isSelected ? 'true' : undefined}
        // The elided name has to be readable somewhere: the rail caps at 460px, so a
        // long name may never fit. Hovering shows it whole, at any width.
        title={session.title}
        onClick={() => onSelect(session.id)}
      >
        <span className={styles.sessionRowTitle}>
          {isPinned && <PushpinOutlined aria-hidden className={styles.pinIndicator} />}
          {/* Its own box, because text-overflow elides text boxes, not flex rows: the
              name shrinks to "…" when the rail is narrow and comes back whole when
              there is room. */}
          <span className={styles.sessionRowTitleText}>{session.title}</span>
        </span>
        <span className={styles.sessionRowTimestamp} aria-hidden="true">
          {formatRelativeTime(session.updatedAt)}
        </span>
      </button>
      {!isDraft && (
        <Dropdown
          trigger={['click']}
          classNames={{ root: 'erd-menu' }}
          // The mockup's menu just appears; antd's 0.2s slide reads as lag on a
          // 150px panel. Empty transitionName disables the motion outright.
          transitionName=""

          menu={{ items: menuItems, onClick: ({ key }) => handleMenuClick(key) }}
        >
          <button
            type="button"
            className={styles.moreActionsButton}
            aria-label={`More actions for ${session.title}`}
          >
            <MoreOutlined aria-hidden />
          </button>
        </Dropdown>
      )}
    </li>
  );
}

export function SessionGroup({
  label,
  sessions,
  selectedSessionId,
  draftSessionId,
  onSelect,
  emptyFallback,
}: {
  label: string;
  sessions: Session[];
  selectedSessionId: string | null;
  /** The open draft, if any — the one row without a more-actions menu. */
  draftSessionId?: string | null;
  onSelect: (id: string) => void;
  /** When set, an empty group keeps its header and shows this line instead of vanishing. */
  emptyFallback?: string;
}) {
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
}

interface SessionListProps {
  onCollapse?: () => void;
  artifactsCount?: number;
}

const SessionList: React.FC<SessionListProps> = ({ onCollapse, artifactsCount }) => {
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
          New chat
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
          <span className={styles.navShortcutLabel}>Schedule</span>
        </button>
        <button
          type="button"
          className={styles.navShortcut}
          aria-current={location.pathname === '/cowork/artifacts' ? 'page' : undefined}
          data-coach={isCoaching ? 'true' : undefined}
          onClick={() => navigate('/cowork/artifacts')}
        >
          <AppstoreOutlined aria-hidden />
          <span className={styles.navShortcutLabel}>Artifacts</span>
          {artifactsCount != null && <span className={styles.countBadge}>{artifactsCount}</span>}
        </button>
      </nav>
      <div className={styles.scrollRegion} data-testid="session-scroll">
        <SessionGroup
          label="Pinned"
          sessions={pinned}
          selectedSessionId={selectedSessionId}
          onSelect={selectAndNavigate}
        />
        <SessionGroup
          label="Recents"
          sessions={recent}
          selectedSessionId={selectedSessionId}
          draftSessionId={draftSessionId}
          onSelect={selectAndNavigate}
          emptyFallback="No recent chats."
        />
      </div>
    </div>
  );
};

export { SessionList };
export default SessionList;
