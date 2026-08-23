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
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import type { Session } from '@/types/api/session';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

import {
  useCreateSession,
  useDeleteSession,
  useRenameSession,
  useSetSessionPinned,
} from '../hooks/useSessionMutations';
import { useSessions } from '../hooks/useSessions';
import { useSessionSelectionStore } from '../store/useSessionSelectionStore';
import styles from './SessionList.module.css';

export function sortByRecency(sessions: Session[]) {
  return [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function SessionRow({
  session,
  isSelected,
  onSelect,
}: {
  session: Session;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const setSessionPinned = useSetSessionPinned();
  const renameSession = useRenameSession();
  const deleteSession = useDeleteSession();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(session.title);

  const menuItems = [
    {
      key: 'pin',
      label: session.pinned ? 'Unpin' : 'Pin',
      icon: session.pinned ? <PushpinFilled aria-hidden /> : <PushpinOutlined aria-hidden />,
    },
    { key: 'rename', label: 'Rename', icon: <EditOutlined aria-hidden /> },
    { key: 'delete', label: 'Delete', danger: true, icon: <DeleteOutlined aria-hidden /> },
  ];

  function handleMenuClick(key: string) {
    if (key === 'pin') {
      setSessionPinned.mutate({ id: session.id, pinned: !session.pinned });
    } else if (key === 'rename') {
      setRenameDraft(session.title);
      setIsRenaming(true);
    } else if (key === 'delete') {
      deleteSession.mutate(session.id);
    }
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
        onClick={() => onSelect(session.id)}
      >
        <span className={styles.sessionRowTitle}>
          {session.pinned && <PushpinOutlined aria-hidden className={styles.pinIndicator} />}
          {session.title}
        </span>
        <span className={styles.sessionRowTimestamp} aria-hidden="true">
          {formatRelativeTime(session.updatedAt)}
        </span>
      </button>
      <Dropdown
        trigger={['click']}
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
    </li>
  );
}

export function SessionGroup({
  label,
  sessions,
  selectedSessionId,
  onSelect,
}: {
  label: string;
  sessions: Session[];
  selectedSessionId: string | null;
  onSelect: (id: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (sessions.length === 0) {
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
      {isExpanded && (
        <ul className={styles.sessionGroupList}>
          {sessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              isSelected={session.id === selectedSessionId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function SessionList({
  onCollapse,
  scheduleCount,
  artifactsCount,
}: {
  onCollapse?: () => void;
  scheduleCount?: number;
  artifactsCount?: number;
}) {
  const { data } = useSessions();
  const sessions = data ?? [];
  const pinned = sortByRecency(sessions.filter((session) => session.pinned));
  const recent = sortByRecency(sessions.filter((session) => !session.pinned));

  const selectedSessionId = useSessionSelectionStore((s) => s.selectedSessionId);
  const selectSession = useSessionSelectionStore((s) => s.selectSession);
  const createSession = useCreateSession();
  const navigate = useNavigate();
  const location = useLocation();

  // Selecting (or creating) a session should always bring the Studio thread
  // into view — matching the mockup's cwSelectSession, which resets cwView
  // to "studio" (line 11050). Without this, selecting a session while on
  // /cowork/artifacts or /cowork/schedule silently updates the store with
  // nothing visibly changing, since the Outlet there isn't showing the
  // thread at all.
  function handleSelectSession(id: string) {
    selectSession(id);
    navigate('/cowork');
  }

  return (
    <div className={styles.sessionList}>
      <div className={styles.topRow}>
        <Button
          type="primary"
          style={{ flex: '1 1 auto', minWidth: 0 }}
          icon={<PlusOutlined aria-hidden />}
          onClick={() => {
            createSession.mutate();
            navigate('/cowork');
          }}
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
          {scheduleCount != null && <span className={styles.countBadge}>{scheduleCount}</span>}
        </button>
        <button
          type="button"
          className={styles.navShortcut}
          aria-current={location.pathname === '/cowork/artifacts' ? 'page' : undefined}
          onClick={() => navigate('/cowork/artifacts')}
        >
          <AppstoreOutlined aria-hidden />
          <span className={styles.navShortcutLabel}>Artifacts</span>
          {artifactsCount != null && <span className={styles.countBadge}>{artifactsCount}</span>}
        </button>
      </nav>
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
  );
}
