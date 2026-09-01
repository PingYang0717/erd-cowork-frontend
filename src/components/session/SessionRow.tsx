import {
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PushpinFilled,
  PushpinOutlined,
} from '@ant-design/icons';
import { Dropdown, Input } from 'antd';
import React, { useState } from 'react';

import {
  useDeleteSession,
  useRenameSession,
  useToggleSessionPin,
} from '@/hooks/useSessionMutations';
import type { Session } from '@/types/api/session';
import { dispatchMenuAction } from '@/utils/dispatchMenuAction';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

import styles from './SessionList.module.css';

/** One conversation in the rail: its title, its relative time, and the actions that
 *  belong to it (rename in place, pin, delete).
 *
 *  Its own file because it is a self-contained interactive surface with three mutations
 *  and an editing mode of its own — leaving it inline meant two thirds of SessionList
 *  was about a single row rather than about the list. It stays coupled to
 *  SessionList.module.css deliberately: row and list share the rail's visual language,
 *  and splitting the stylesheet would separate rules that are read together.
 */
interface SessionRowProps {
  session: Session;
  isSelected: boolean;
  /** A draft exists only in this client until its first message (ADR-0005). Rename,
   *  pin and delete have nothing to act on, so the row offers none of them. */
  isDraft: boolean;
  onSelect: (id: string) => void;
}

const SessionRow: React.FC<SessionRowProps> = ({ session, isSelected, isDraft, onSelect }) => {
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
};

export default SessionRow;
