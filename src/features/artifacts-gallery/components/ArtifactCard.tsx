import {
  CopyOutlined,
  DashboardOutlined,
  DeleteOutlined,
  FilePptOutlined,
  MoreOutlined,
  PushpinFilled,
  PushpinOutlined,
  ShareAltOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { Dropdown } from 'antd';
import { useState } from 'react';

import { ShareArtifactDialog } from '@/features/artifact/components/ShareArtifactDialog';
import {
  useDeleteArtifact,
  useSetArtifactPinned,
} from '@/features/artifact/hooks/useArtifactMutations';
import { useSessions } from '@/features/session/hooks/useSessions';
import type { Artifact } from '@/types/api';
import { dispatchMenuAction } from '@/utils/dispatchMenuAction';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

import styles from './ArtifactCard.module.css';

export function ArtifactCard({
  artifact,
  onOpen,
}: {
  artifact: Artifact;
  onOpen: (artifact: Artifact) => void;
}) {
  const setArtifactPinned = useSetArtifactPinned();
  const deleteArtifact = useDeleteArtifact();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { data: sessions } = useSessions();
  const sessionTitle = sessions?.find((s) => s.id === artifact.sessionId)?.title;

  const menuItems = [
    {
      key: 'pin',
      label: artifact.pinned ? 'Unpin' : 'Pin',
      icon: artifact.pinned ? <PushpinFilled aria-hidden /> : <PushpinOutlined aria-hidden />,
    },
    { key: 'copyLink', label: 'Copy link', icon: <CopyOutlined aria-hidden /> },
    artifact.sharedBy
      ? null
      : { key: 'share', label: 'Share', icon: <ShareAltOutlined aria-hidden /> },
    { type: 'divider' as const },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      icon: <DeleteOutlined aria-hidden />,
    },
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  function handleMenuClick(key: string) {
    dispatchMenuAction(key, {
      pin: () => setArtifactPinned.mutate({ id: artifact.id, pinned: !artifact.pinned }),
      copyLink: () =>
        navigator.clipboard.writeText(`${window.location.origin}/cowork/artifact/${artifact.id}`),
      share: () => setIsShareOpen(true),
      delete: () => deleteArtifact.mutate(artifact.id),
    });
  }

  return (
    <div className={styles.card} role="listitem">
      <button type="button" className={styles.open} onClick={() => onOpen(artifact)}>
        <span
          className={styles.thumbnail}
          aria-hidden="true"
          data-testid="artifact-thumbnail"
          data-kind={artifact.kind}
        >
          {artifact.kind === 'slides' ? (
            <FilePptOutlined className={styles.thumbnailIcon} />
          ) : (
            <DashboardOutlined className={styles.thumbnailIcon} />
          )}
          {artifact.sharedBy && <span className={styles.sharedToMeOverlay}>Shared to me</span>}
        </span>
        <span className={styles.body}>
          <span className={styles.titleRow}>
            <span className={styles.name}>{artifact.name}</span>
            <span className={styles.kindTag} aria-hidden="true">
              {artifact.kind === 'slides' ? 'Deck' : 'Dash'}
            </span>
          </span>
          {sessionTitle && (
            <span className={styles.sessionRow} aria-hidden="true">
              {sessionTitle}
            </span>
          )}
          <span className={styles.metaRow} aria-hidden="true">
            <span className={styles.time}>{formatRelativeTime(artifact.createdAt)}</span>
            {artifact.shared && <span className={styles.sharedBadge}>Shared</span>}
            {artifact.sharedBy && (
              <span className={styles.sharedByBadge}>
                <UsergroupAddOutlined /> {artifact.sharedBy}
              </span>
            )}
          </span>
        </span>
      </button>
      <button
        type="button"
        className={styles.pinButton}
        aria-label={artifact.pinned ? `Unpin ${artifact.name}` : `Pin ${artifact.name}`}
        aria-pressed={artifact.pinned}
        onClick={() => setArtifactPinned.mutate({ id: artifact.id, pinned: !artifact.pinned })}
      >
        {artifact.pinned ? <PushpinFilled aria-hidden /> : <PushpinOutlined aria-hidden />}
      </button>
      <Dropdown
        trigger={['click']}
        overlayClassName="erd-menu"
        menu={{ items: menuItems, onClick: ({ key }) => handleMenuClick(key) }}
      >
        <button
          type="button"
          className={styles.moreActionsButton}
          aria-label={`More actions for ${artifact.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreOutlined aria-hidden />
        </button>
      </Dropdown>
      <ShareArtifactDialog
        open={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        artifact={artifact}
      />
    </div>
  );
}
