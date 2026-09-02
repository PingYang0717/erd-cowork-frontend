import {
  AppstoreOutlined,
  CheckOutlined,
  ExportOutlined,
  ReloadOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Tooltip from '@/components/common/Tooltip';
import { useArtifactContent } from '@/hooks/useArtifactContent';
import { usePublishArtifact } from '@/hooks/useArtifactMutations';
import { useArtifacts } from '@/hooks/useArtifacts';
import { useSessionDetail } from '@/hooks/useSessionDetail';
import { useActiveRunStore } from '@/stores/useActiveRunStore';
import { usePublishCoachStore } from '@/stores/usePublishCoachStore';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import type { ArtifactVersion } from '@/types/api';
import { artifactHref } from '@/utils/artifactUrl';
import { deriveArtifactVersions } from '@/utils/deriveArtifactVersions';

import ArtifactFrame from './ArtifactFrame';
import styles from './ArtifactPanel.module.css';
import PublishArtifactDialog from './PublishArtifactDialog';
import ShareArtifactDialog from './ShareArtifactDialog';
import VersionSwitcher from './VersionSwitcher';

const EmptyPanel: React.FC = () => {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>
        <AppstoreOutlined aria-hidden />
      </div>
      <p className={styles.emptyHeading}>No artifact yet</p>
      <p className={styles.emptyText}>
        Ask eRD AI to build a dashboard or a deck — the result renders here.
      </p>
    </div>
  );
};

const ArtifactPanel: React.FC = () => {
  const selectedSessionId = useSessionSelectionStore((s) => s.selectedSessionId);

  if (!selectedSessionId) {
    return <EmptyPanel />;
  }

  return <ArtifactPanelView key={selectedSessionId} sessionId={selectedSessionId} />;
};

interface ArtifactPanelViewProps {
  sessionId: string;
}

const ArtifactPanelView: React.FC<ArtifactPanelViewProps> = ({ sessionId }) => {
  const { data: detail } = useSessionDetail(sessionId);
  const streamedArtifact = useActiveRunStore((s) => s.streamedArtifact);
  // The pick lives in the store rather than here because the version menu is no longer
  // the only thing that makes one: a past reply's Artifact chip picks too.
  const selectedArtifactId = useActiveRunStore((s) => s.pickedArtifactId);
  const pickArtifact = useActiveRunStore((s) => s.pickArtifact);
  const clearPickedArtifact = useActiveRunStore((s) => s.clearPickedArtifact);

  // Every artifact-bearing message is a version; a live-stream artifact that the
  // refetch has not caught up with yet is appended as the next one.
  const versions = useMemo<ArtifactVersion[]>(() => {
    const derived = deriveArtifactVersions(detail.messages);
    if (!streamedArtifact || derived.some((v) => v.artifactId === streamedArtifact.artifactId)) {
      return derived;
    }
    return [
      ...derived,
      {
        artifactId: streamedArtifact.artifactId,
        title: streamedArtifact.title,
      },
    ];
  }, [detail.messages, streamedArtifact]);

  // A newly produced artifact takes over ONCE (the user asked for it); after that a
  // manual pick wins again — continuous streamed priority would pin the panel to the
  // last run forever and make the version menu inert. The take-over happens where the
  // artifact arrives (`setStreamedArtifact` drops the pick), so nothing needs
  // adjusting during render here.
  const streamedId = streamedArtifact?.artifactId ?? null;

  // A pick belongs to the thread it was made in. This view is keyed by session, so the
  // unmount that a session switch causes is what retires it.
  useEffect(() => clearPickedArtifact, [clearPickedArtifact]);

  const activeVersion =
    versions.find((v) => v.artifactId === selectedArtifactId) ??
    (streamedId ? versions.find((v) => v.artifactId === streamedId) : undefined) ??
    versions[versions.length - 1];
  const artifactId = activeVersion?.artifactId ?? null;

  if (!activeVersion || !artifactId) {
    return <EmptyPanel />;
  }

  return (
    <ArtifactPanelContent
      artifactId={artifactId}
      versions={versions}
      activeVersion={activeVersion}
      onSelectVersion={pickArtifact}
    />
  );
};

interface ArtifactPanelContentProps {
  artifactId: string;
  versions: ArtifactVersion[];
  activeVersion: ArtifactVersion;
  onSelectVersion: (artifactId: string) => void;
}

const ArtifactPanelContent: React.FC<ArtifactPanelContentProps> = ({
  artifactId,
  versions,
  activeVersion,
  onSelectVersion,
}) => {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const reloadNonce = useActiveRunStore((s) => s.artifactReloadNonce);
  const bumpArtifactReload = useActiveRunStore((s) => s.bumpArtifactReload);
  const isRunStreaming = useActiveRunStore((s) => s.isRunStreaming);
  const { data, isError } = useArtifactContent(artifactId, reloadNonce);
  const { data: artifacts } = useArtifacts();
  const setDisplayedArtifactId = useActiveRunStore((s) => s.setDisplayedArtifactId);
  const artifact = artifacts?.find((a) => a.id === artifactId);
  const publishArtifact = usePublishArtifact();
  const startCoach = usePublishCoachStore((s) => s.start);

  // The thread sends the artifact on display as `baseArtifactId`, so a follow-up
  // question iterates on what the user is looking at. Published from here, where the
  // fetch result is known, rather than from the version resolution above: an artifact
  // that has been deleted still appears in the version list (versions come from the
  // messages, which keep their artifactId), and announcing it as "displayed" would send
  // the backend off to iterate on something it no longer has.
  // Gated on `isError`, not on `data`: a freshly produced Artifact has no content in
  // hand for a moment, and refusing to announce it then would drop `baseArtifactId`
  // from the very next question — the iteration case this exists for. Only a fetch that
  // has actually failed means the Artifact is not there to iterate on.
  useEffect(() => {
    setDisplayedArtifactId(isError ? null : artifactId);
    return () => setDisplayedArtifactId(null);
  }, [artifactId, isError, setDisplayedArtifactId]);

  // Enrich the derived versions with each artifact's published state for the menu's
  // green check; the artifacts list is the mock's 前端-only source for it.
  // The menu's own numbering and naming come from the Artifacts list: `version` is what
  // the backend counts, and `title` is the name the user gave it at publish time — the
  // message's wording is only a stand-in until the list catches up.
  const enrichedVersions = useMemo<ArtifactVersion[]>(
    () =>
      versions.map((version) => {
        const listed = artifacts?.find((a) => a.id === version.artifactId);
        return {
          ...version,
          title: listed?.title ?? version.title,
          version: listed?.version,
          publishedAt: listed?.publishedAt,
        };
      }),
    [versions, artifacts],
  );

  // 發布 = 把這個 Artifact 開放給別人使用。The mockup's button says 生成 Artifact;
  // what it does is publish, and `publishedAt` is where that lives now.
  const isPublished = artifact?.publishedAt != null;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        {enrichedVersions.length > 0 && (
          <VersionSwitcher
            versions={enrichedVersions}
            activeVersion={{ ...activeVersion, publishedAt: artifact?.publishedAt ?? null }}
            onSelect={onSelectVersion}
          />
        )}
        {isPublished ? (
          // Unpublishing lives on the Artifact management page, not here — this chip
          // states the fact rather than offering to undo it.
          <Tooltip content="此版本已發布，其他人可以使用">
            <span className={styles.publishedBadge}>
              <CheckOutlined aria-hidden />
              已發布
            </span>
          </Tooltip>
        ) : (
          <button
            type="button"
            className={styles.generateButton}
            disabled={publishArtifact.isPending}
            onClick={() => setIsPublishOpen(true)}
          >
            發布 Artifact
          </button>
        )}
        {/* Sharing rests on publication: a recipient's access is access to a published
            Artifact. Kept visible rather than hidden so the relationship is something
            the user can see, not something they discover. */}
        <Tooltip
          content={isPublished ? '分享' : '發布後才能分享'}
          wrapperClassName={styles.shareButtonSlot}
        >
          <button
            type="button"
            className={styles.shareButton}
            aria-label="Share artifact"
            disabled={!isPublished}
            onClick={() => setIsShareOpen(true)}
          >
            <ShareAltOutlined aria-hidden />
          </button>
        </Tooltip>
        <Tooltip content="重新整理">
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Reload artifact"
            // Mid-run the version on screen is still being written; remounting now would
            // present a half-finished document as the result.
            disabled={isRunStreaming}
            onClick={bumpArtifactReload}
          >
            <ReloadOutlined aria-hidden />
          </button>
        </Tooltip>
        <Tooltip content="在新分頁開啟預覽">
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Open artifact in new tab"
            onClick={() => window.open(artifactHref(artifactId), '_blank', 'noopener,noreferrer')}
          >
            <ExportOutlined aria-hidden />
          </button>
        </Tooltip>
      </div>
      <div className={styles.frameWrapper}>
        {/* The header above stays whatever happens here. An Artifact that has been
            deleted is still listed as a version (versions come from the messages, which
            keep their artifactId), so the frame failing must not take the version
            switcher down with it — that would leave the user looking at nothing with no
            way back to the versions that do still exist. */}
        {data !== undefined ? (
          <ArtifactFrame key={`${artifactId}-${reloadNonce}`} html={data} artifactId={artifactId} />
        ) : isError ? (
          <p role="status" className={styles.frameNotice}>
            這個 Artifact 已不存在,可能已被刪除。請從上方選單挑選其他產出。
          </p>
        ) : null}
      </div>
      <PublishArtifactDialog
        open={isPublishOpen}
        // The version's own name is only a suggestion: what the Gallery will show is
        // whatever the user settles on here.
        suggestedTitle={activeVersion.title}
        isPublishing={publishArtifact.isPending}
        onCancel={() => setIsPublishOpen(false)}
        onConfirm={(title) =>
          publishArtifact.mutate(
            { id: artifactId, title },
            {
              onSuccess: () => {
                setIsPublishOpen(false);
                startCoach();
              },
            },
          )
        }
      />
      {artifact && (
        <ShareArtifactDialog
          open={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          artifact={artifact}
        />
      )}
      <PublishedToast />
    </div>
  );
};

// The mockup's post-publish toast: confirms where the Artifact landed and
// offers a jump to the gallery. The rail's coach highlight shares its state
// and both clear together on dismiss.
const PublishedToast: React.FC = () => {
  const navigate = useNavigate();
  const isActive = usePublishCoachStore((s) => s.isActive);
  const dismiss = usePublishCoachStore((s) => s.dismiss);

  if (!isActive) {
    return null;
  }

  return (
    <div role="status" aria-label="Artifact 已發布" className={styles.publishedToast}>
      <span className={styles.publishedToastText}>已發布 — 已加入左側 Artifacts 清單。</span>
      <button
        type="button"
        className={styles.publishedToastPrimary}
        onClick={() => {
          dismiss();
          navigate('/cowork/artifacts');
        }}
      >
        前往 Artifacts
      </button>
      <button type="button" className={styles.publishedToastDismiss} onClick={dismiss}>
        知道了
      </button>
    </div>
  );
};

export default ArtifactPanel;
