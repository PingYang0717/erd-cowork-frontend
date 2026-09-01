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

import ShareArtifactDialog from '@/components/artifact/ShareArtifactDialog';
import { useToggleArtifactPin, useUnpublishArtifact } from '@/hooks/useArtifactMutations';
import type { Artifact } from '@/types/api/index';
import { artifactHref } from '@/utils/artifactUrl';
import { dispatchMenuAction } from '@/utils/dispatchMenuAction';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

import styles from './ArtifactCard.module.css';

interface ArtifactCardProps {
  artifact: Artifact;
  onOpen: (artifact: Artifact) => void;
}

const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact, onOpen }) => {
  const toggleArtifactPin = useToggleArtifactPin();
  const unpublishArtifact = useUnpublishArtifact();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const isPinned = artifact.pinnedAt !== null;
  // Shared *to me*: someone else owns it. `isShared` is the opposite direction —
  // whether this Artifact has been shared out, which the meta row badges below.
  const isSharedToMe = !artifact.isOwn;

  // Everything goes straight to the backend; an endpoint that has not landed answers
  // Pinning is never gated: it is this reader's own bookmark on someone's work, not
  // something the owner grants. Everything else here acts on the Artifact itself, so it
  // belongs to whoever owns it — and is absent rather than disabled on a card that does
  // not, since a greyed row invites a click that can never work.
  const menuItems = [
    {
      key: 'pin',
      label: isPinned ? 'Unpin' : 'Pin',
      icon: isPinned ? <PushpinFilled aria-hidden /> : <PushpinOutlined aria-hidden />,
    },
    ...(artifact.isOwn
      ? [
          { key: 'copyLink', label: 'Copy link', icon: <CopyOutlined aria-hidden /> },
          { key: 'share', label: 'Share', icon: <ShareAltOutlined aria-hidden /> },
          { type: 'divider' as const },
          {
            key: 'unpublish',
            // Reads "Delete" to the user, and is `unpublishArtifact` underneath: from
            // where they stand this removes the Artifact, and the fact that it survives
            // inside its conversation is not something a menu has to explain. Not
            // `danger` — nothing is destroyed, so the red would be overstating it.
            label: 'Delete',
            icon: <DeleteOutlined aria-hidden />,
          },
        ]
      : []),
  ];

  function handleMenuClick(key: string) {
    dispatchMenuAction(key, {
      pin: () => toggleArtifactPin.mutate(artifact.id),
      copyLink: () => navigator.clipboard.writeText(artifactHref(artifact.id)),
      share: () => setIsShareOpen(true),
      unpublish: () => unpublishArtifact.mutate(artifact.id),
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
          onClick={() => toggleArtifactPin.mutate(artifact.id)}
        >
          {isPinned ? <PushpinFilled aria-hidden /> : <PushpinOutlined aria-hidden />}
        </button>
      </span>
      <Dropdown
        trigger={['click']}
        classNames={{ root: 'erd-menu' }}
        transitionName=""

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

export default ArtifactCard;
