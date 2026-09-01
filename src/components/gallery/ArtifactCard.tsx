import {
  CopyOutlined,
  DashboardOutlined,
  DeleteOutlined,
  EyeInvisibleOutlined,
  MoreOutlined,
  PushpinFilled,
  PushpinOutlined,
  ShareAltOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { Dropdown, Modal } from 'antd';
import React, { useState } from 'react';

import ShareArtifactDialog from '@/components/artifact/ShareArtifactDialog';
import {
  useDeleteArtifact,
  useToggleArtifactPin,
  useUnpublishArtifact,
} from '@/hooks/useArtifactMutations';
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
  const deleteArtifact = useDeleteArtifact();
  const unpublishArtifact = useUnpublishArtifact();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const isPinned = artifact.pinnedAt !== null;
  // Shared *to me*: someone else owns it. `isShared` is the opposite direction —
  // whether this Artifact has been shared out, which the meta row badges below.
  const isSharedToMe = !artifact.isOwn;

  // Everything goes straight to the backend; an endpoint that has not landed answers
  // with an error the mutation toasts. `canPin` is the one permission the backend
  // states up front.
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
          label: 'Share',
          icon: <ShareAltOutlined aria-hidden />,
        }
      : null,
    artifact.isOwn
      ? {
          key: 'unpublish',
          label: 'Unpublish',
          icon: <EyeInvisibleOutlined aria-hidden />,
        }
      : null,
    { type: 'divider' as const },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      icon: <DeleteOutlined aria-hidden />,
    },
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  // Unpublishing revokes access for everyone the Artifact was shared with — publication
  // is what sharing rests on. An Artifact nobody has been given goes quietly; one that
  // is out there does not.
  function confirmUnpublish() {
    if (!artifact.isShared) {
      unpublishArtifact.mutate(artifact.id);
      return;
    }
    Modal.confirm({
      title: '取消發布這個 Artifact?',
      content: `「${artifact.title}」已分享出去。取消發布會一併收回所有收件者的存取權,他們的連結將立即失效。`,
      okText: '取消發布',
      okButtonProps: { danger: true },
      cancelText: '保留',
      onOk: () => unpublishArtifact.mutate(artifact.id),
    });
  }

  function handleMenuClick(key: string) {
    dispatchMenuAction(key, {
      pin: () => toggleArtifactPin.mutate(artifact.id),
      copyLink: () => navigator.clipboard.writeText(artifactHref(artifact.id)),
      share: () => setIsShareOpen(true),
      unpublish: confirmUnpublish,
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
