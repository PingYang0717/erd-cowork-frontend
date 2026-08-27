import {
  CopyOutlined,
  DashboardOutlined,
  DeleteOutlined,
  MoreOutlined,
  PushpinFilled,
  PushpinOutlined,
  ShareAltOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { Dropdown } from 'antd';
import React, { useState } from 'react';

import { ShareArtifactDialog } from '@/components/artifact/ShareArtifactDialog';
import { UnsupportedLabel } from '@/components/common/UnsupportedLabel';
import { useDeleteArtifact, useToggleArtifactPin } from '@/hooks/useArtifactMutations';
import type { Artifact } from '@/types/api/index';
import { dispatchMenuAction } from '@/utils/dispatchMenuAction';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

import styles from './ArtifactCard.module.css';

interface ArtifactCardProps {
  artifact: Artifact;
  onOpen: (artifact: Artifact) => void;
}

const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact, onOpen }) => {
  const toggleArtifactPin = useToggleArtifactPin();
  const deleteArtifact = useDeleteArtifact();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const isPinned = artifact.pinnedAt !== null;
  // Shared *to me*: someone else owns it. `isShared` is the opposite direction —
  // whether this Artifact has been shared out, which the meta row badges below.
  const isSharedToMe = !artifact.isOwn;

  // Pin is live — the backend has the endpoint, and `canPin` says whether this user
  // may use it. Share and Delete have no endpoint yet (ADR-0009); Copy link never
  // needed one, it reads the current URL.
  const menuItems = [
    {
      key: 'pin',
      label: isPinned ? 'Unpin' : 'Pin',
      icon: isPinned ? <PushpinFilled aria-hidden /> : <PushpinOutlined aria-hidden />,
      disabled: !artifact.canPin,
    },
    { key: 'copyLink', label: 'Copy link', icon: <CopyOutlined aria-hidden /> },
    artifact.canShare
      ? {
          key: 'share',
          label: <UnsupportedLabel label="Share" />,
          icon: <ShareAltOutlined aria-hidden />,
          disabled: true,
        }
      : null,
    { type: 'divider' as const },
    {
      key: 'delete',
      label: <UnsupportedLabel label="Delete" />,
      danger: true,
      icon: <DeleteOutlined aria-hidden />,
      disabled: true,
    },
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  function handleMenuClick(key: string) {
    dispatchMenuAction(key, {
      pin: () => toggleArtifactPin.mutate(artifact.id),
      copyLink: () =>
        navigator.clipboard.writeText(`${window.location.origin}/cowork/artifact/${artifact.id}`),
      share: () => setIsShareOpen(true),
      delete: () => deleteArtifact.mutate(artifact.id),
    });
  }

  return (
    <div className={styles.card} role="listitem">
      <button type="button" className={styles.open} onClick={() => onOpen(artifact)}>
        {/* One thumbnail for every Artifact: the contract dropped `kind`, and it
            returns as `type` once the backend adds it (types/api/artifact.ts). */}
        <span className={styles.thumbnail} aria-hidden="true" data-testid="artifact-thumbnail">
          <DashboardOutlined className={styles.thumbnailIcon} />
          {isSharedToMe && <span className={styles.sharedToMeOverlay}>Shared to me</span>}
        </span>
        <span className={styles.body}>
          <span className={styles.titleRow}>
            <span className={styles.name}>{artifact.title}</span>
          </span>
          {artifact.sessionTitle && (
            <span className={styles.sessionRow} aria-hidden="true">
              {artifact.sessionTitle}
            </span>
          )}
          <span className={styles.metaRow} aria-hidden="true">
            <span className={styles.time}>{formatRelativeTime(artifact.createdAt)}</span>
            {artifact.isShared && <span className={styles.sharedBadge}>Shared</span>}
            {isSharedToMe && (
              <span className={styles.sharedByBadge}>
                <UsergroupAddOutlined /> {artifact.ownerDisplay}
              </span>
            )}
          </span>
        </span>
      </button>
      <span className={styles.pinButtonSlot}>
        <button
          type="button"
          className={styles.pinButton}
          aria-label={isPinned ? `Unpin ${artifact.title}` : `Pin ${artifact.title}`}
          aria-pressed={isPinned}
          disabled={!artifact.canPin}
          onClick={() => toggleArtifactPin.mutate(artifact.id)}
        >
          {isPinned ? <PushpinFilled aria-hidden /> : <PushpinOutlined aria-hidden />}
        </button>
      </span>
      <Dropdown
        trigger={['click']}
        classNames={{ root: 'erd-menu' }}
        menu={{ items: menuItems, onClick: ({ key }) => handleMenuClick(key) }}
      >
        <button
          type="button"
          className={styles.moreActionsButton}
          aria-label={`More actions for ${artifact.title}`}
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
};

export { ArtifactCard };
export default ArtifactCard;
