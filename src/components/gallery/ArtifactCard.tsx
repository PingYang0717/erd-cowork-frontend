import React, { useState } from 'react';
import { App, Dropdown } from 'antd';
import {
  CopyOutlined,
  DashboardOutlined,
  DeleteOutlined,
  MoreOutlined,
  PushpinFilled,
  PushpinOutlined,
  ShareAltOutlined,
  UsergroupAddOutlined,
  UserOutlined,
} from '@ant-design/icons';

import ShareArtifactDialog from '@/components/artifact/ShareArtifactDialog';
import { useToggleArtifactPin, useUnpublishArtifact } from '@/hooks/useArtifactMutations';
import { useConfirmDestructive } from '@/hooks/useConfirmDestructive';
import { useTranslations } from '@/i18n/useTranslations';
import type { Artifact } from '@/types/api';
import { artifactHref } from '@/utils/artifactUrl';
import { dispatchMenuAction } from '@/utils/dispatchMenuAction';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

import styles from './ArtifactCard.module.css';

interface ArtifactCardProps {
  artifact: Artifact;
  onOpen: (artifact: Artifact) => void;
}

const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact, onOpen }) => {
  const t = useTranslations();
  const { message } = App.useApp();
  const confirmDestructive = useConfirmDestructive();
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
      label: isPinned ? t.galleryHeader.unpin : t.galleryHeader.pin,
      icon: isPinned ? <PushpinFilled aria-hidden /> : <PushpinOutlined aria-hidden />,
    },
    ...(artifact.isOwn
      ? [
          { key: 'copyLink', label: t.galleryHeader.copyLink, icon: <CopyOutlined aria-hidden /> },
          { key: 'share', label: t.galleryHeader.share, icon: <ShareAltOutlined aria-hidden /> },
          { type: 'divider' as const },
          {
            key: 'unpublish',
            // Reads "Delete" to the user, and is `unpublishArtifact` underneath: from
            // where they stand this removes the Artifact, and the fact that it survives
            // inside its conversation is not something a menu has to explain.
            // `danger` for the red wording — the fill it normally brings is turned off in
            // `.erd-menu` (index.css), since a red row reads as a warning about where the
            // pointer is rather than about what the action does.
            danger: true,
            label: t.galleryHeader.delete,
            icon: <DeleteOutlined aria-hidden />,
          },
        ]
      : []),
  ];

  /** The menu closes the moment it is clicked, so a toast is the only place this
   *  action can speak from — and it used to say nothing either way: an awaited-nowhere
   *  promise, success indistinguishable from a clipboard refusal. `message.*?.` —
   *  outside AppProviders (component tests) `useApp` returns an empty object. */
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(artifactHref(artifact.id));
      message.success?.(t.gallery.linkCopied);
    } catch {
      // Not describeActionError: the clipboard refusing is not a backend problem,
      // and "the backend is not ready" would send the user to the wrong place.
      message.error?.(t.gallery.linkCopyFailed);
    }
  };

  const handleMenuClick = (key: string) => {
    dispatchMenuAction(key, {
      pin: () => toggleArtifactPin.mutate(artifact.id),
      copyLink: () => void copyLink(),
      share: () => setIsShareOpen(true),
      // Confirmed first: the consequence lands on other people — every recipient
      // loses access — which is exactly the sentence the dialog makes the user read.
      unpublish: () =>
        confirmDestructive({
          title: t.gallery.removeConfirmTitle,
          body: t.gallery.removeConfirmBody(artifact.title),
          confirmLabel: t.gallery.removeConfirm,
          onConfirm: () => unpublishArtifact.mutate(artifact.id),
        }),
    });
  };

  return (
    <div className={styles.card} role="listitem">
      <button type="button" className={styles.open} onClick={() => onOpen(artifact)}>
        {/* One thumbnail for every Artifact: the contract dropped `kind`, and it
            returns as `type` once the backend adds it (types/api/artifact.ts). */}
        <span className={styles.thumbnail} aria-hidden="true" data-testid="artifact-thumbnail">
          <DashboardOutlined className={styles.thumbnailIcon} />
          {isSharedToMe && (
            <span className={styles.sharedToMeOverlay}>
              <UsergroupAddOutlined />
              {t.galleryHeader.sharedToMe}
            </span>
          )}
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
            {artifact.isShared && <span className={styles.sharedBadge}>{t.galleryHeader.sharedBadge}</span>}
            {isSharedToMe && (
              <span className={styles.sharedByBadge}>
                <UserOutlined /> {artifact.ownerDisplay}
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
      <ShareArtifactDialog open={isShareOpen} onClose={() => setIsShareOpen(false)} artifact={artifact} />
    </div>
  );
};

export default ArtifactCard;
