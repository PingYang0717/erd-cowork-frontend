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
import type { ArtifactVersion } from '@/types/api/index';
import { deriveArtifactVersions } from '@/utils/deriveArtifactVersions';

import ArtifactFrame from './ArtifactFrame';
import styles from './ArtifactPanel.module.css';
import ShareArtifactDialog from './ShareArtifactDialog';
import VersionSwitcher from './VersionSwitcher';

function EmptyPanel() {
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
}

const ArtifactPanel: React.FC = () => {
  const selectedSessionId = useSessionSelectionStore((s) => s.selectedSessionId);

  if (!selectedSessionId) {
    return <EmptyPanel />;
  }

  return <ArtifactPanelView key={selectedSessionId} sessionId={selectedSessionId} />;
};

function ArtifactPanelView({ sessionId }: { sessionId: string }) {
  const { data: detail } = useSessionDetail(sessionId);
  const streamedArtifact = useActiveRunStore((s) => s.streamedArtifact);
  const setDisplayedArtifactId = useActiveRunStore((s) => s.setDisplayedArtifactId);
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
        version: derived.length + 1,
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

  // The thread sends the artifact on display as baseArtifactId, so a follow-up
  // question iterates on what the user is looking at.
  useEffect(() => {
    setDisplayedArtifactId(artifactId);
    return () => setDisplayedArtifactId(null);
  }, [artifactId, setDisplayedArtifactId]);

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
}

function ArtifactPanelContent({
  artifactId,
  versions,
  activeVersion,
  onSelectVersion,
}: {
  artifactId: string;
  versions: ArtifactVersion[];
  activeVersion: ArtifactVersion;
  onSelectVersion: (artifactId: string) => void;
}) {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const reloadNonce = useActiveRunStore((s) => s.artifactReloadNonce);
  const bumpArtifactReload = useActiveRunStore((s) => s.bumpArtifactReload);
  const isRunStreaming = useActiveRunStore((s) => s.isRunStreaming);
  const { data } = useArtifactContent(artifactId, reloadNonce);
  const { data: artifacts } = useArtifacts();
  const artifact = artifacts?.find((a) => a.id === artifactId);
  const publishArtifact = usePublishArtifact();
  const startCoach = usePublishCoachStore((s) => s.start);

  // Enrich the derived versions with each artifact's published state for the menu's
  // green check; the artifacts list is the mock's 前端-only source for it.
  const enrichedVersions = useMemo<ArtifactVersion[]>(
    () =>
      versions.map((version) => ({
        ...version,
        publishedAt: artifacts?.find((a) => a.id === version.artifactId)?.publishedAt,
      })),
    [versions, artifacts],
  );

  if (data === undefined) {
    return <EmptyPanel />;
  }

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
            onClick={() => publishArtifact.mutate(artifactId, { onSuccess: startCoach })}
          >
            發布 Artifact
          </button>
        )}
        <Tooltip content="分享" wrapperClassName={styles.shareButtonSlot}>
          <button
            type="button"
            className={styles.shareButton}
            aria-label="Share artifact"
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
            onClick={() =>
              window.open(`/cowork/artifact/${artifactId}`, '_blank', 'noopener,noreferrer')
            }
          >
            <ExportOutlined aria-hidden />
          </button>
        </Tooltip>
      </div>
      <div className={styles.frameWrapper}>
        <ArtifactFrame key={`${artifactId}-${reloadNonce}`} html={data} artifactId={artifactId} />
      </div>
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
}

// The mockup's post-publish toast: confirms where the Artifact landed and
// offers a jump to the gallery. The rail's coach highlight shares its state
// and both clear together on dismiss.
function PublishedToast() {
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
}

export default ArtifactPanel;
