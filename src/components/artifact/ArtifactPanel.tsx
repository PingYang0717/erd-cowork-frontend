import {
  AppstoreOutlined,
  CheckOutlined,
  ExportOutlined,
  ReloadOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Tooltip } from '@/components/common/Tooltip';
import { useArtifactContent } from '@/hooks/useArtifactContent';
import { useGenerateArtifact } from '@/hooks/useArtifactMutations';
import { useArtifacts } from '@/hooks/useArtifacts';
import { useArtifactTheme } from '@/hooks/useArtifactTheme';
import { useSessionDetail } from '@/hooks/useSessionDetail';
import { useActiveRunStore } from '@/stores/useActiveRunStore';
import { useGenerateCoachStore } from '@/stores/useGenerateCoachStore';
import { usePendingPromptStore } from '@/stores/usePendingPromptStore';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import type { ArtifactVersion } from '@/types/api/index';
import { deriveArtifactVersions } from '@/utils/deriveArtifactVersions';

import { ArtifactFrame } from './ArtifactFrame';
import styles from './ArtifactPanel.module.css';
import { ShareArtifactDialog } from './ShareArtifactDialog';
import { VersionSwitcher } from './VersionSwitcher';

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
  // last run forever and make the version menu inert. The take-over now happens where
  // the artifact arrives (`setStreamedArtifact` drops the pick), so this no longer
  // needs adjusting during render.
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
  const theme = useArtifactTheme();

  const [isShareOpen, setIsShareOpen] = useState(false);
  const { data } = useArtifactContent(artifactId, theme);
  const { data: artifacts } = useArtifacts();
  const artifact = artifacts?.find((a) => a.id === artifactId);
  const generateArtifact = useGenerateArtifact();
  const sendPrompt = usePendingPromptStore((s) => s.sendPrompt);
  const startCoach = useGenerateCoachStore((s) => s.start);

  // Enrich the derived versions with each artifact's generated state for the menu's
  // green check; the artifacts list is the mock's 前端-only source for it.
  const enrichedVersions = useMemo<ArtifactVersion[]>(
    () =>
      versions.map((version) => ({
        ...version,
        generated: artifacts?.find((a) => a.id === version.artifactId)?.generated,
      })),
    [versions, artifacts],
  );

  if (data === undefined) {
    return <EmptyPanel />;
  }

  const isGenerated = artifact?.generated === true;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        {enrichedVersions.length > 0 && (
          <VersionSwitcher
            versions={enrichedVersions}
            activeVersion={{ ...activeVersion, generated: isGenerated }}
            onSelect={onSelectVersion}
          />
        )}
        {isGenerated ? (
          <Tooltip content="此版本已生成 Artifact，可用右側分享">
            <span className={styles.generatedBadge}>
              <CheckOutlined aria-hidden />
              已生成
            </span>
          </Tooltip>
        ) : (
          <button
            type="button"
            className={styles.generateButton}
            disabled={generateArtifact.isPending}
            onClick={() => generateArtifact.mutate(artifactId, { onSuccess: startCoach })}
          >
            生成 Artifact
          </button>
        )}
        <Tooltip
          content={isGenerated ? '分享' : '請先生成 Artifact'}
          wrapperClassName={styles.shareButtonSlot}
        >
          <button
            type="button"
            className={styles.shareButton}
            aria-label="Share artifact"
            disabled={!isGenerated}
            onClick={() => setIsShareOpen(true)}
          >
            <ShareAltOutlined aria-hidden />
          </button>
        </Tooltip>
        <Tooltip content="重新生成">
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Regenerate artifact"
            onClick={() =>
              // The mockup's regenerate sends a chat message (cwRegen); the run
              // iterates on this artifact and lands as the next version.
              sendPrompt?.({ question: 'Regenerate the dashboard.', baseArtifactId: artifactId })
            }
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
        <ArtifactFrame html={data} theme={theme} artifactId={artifactId} />
      </div>
      {artifact && (
        <ShareArtifactDialog
          open={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          artifact={artifact}
        />
      )}
      <GeneratedToast />
    </div>
  );
}

// The mockup's post-generate toast: confirms where the Artifact landed and
// offers a jump to the gallery. The rail's coach highlight shares its state
// and both clear together on dismiss.
function GeneratedToast() {
  const navigate = useNavigate();
  const isActive = useGenerateCoachStore((s) => s.isActive);
  const dismiss = useGenerateCoachStore((s) => s.dismiss);

  if (!isActive) {
    return null;
  }

  return (
    <div role="status" aria-label="Artifact 已生成" className={styles.generatedToast}>
      <span className={styles.generatedToastText}>已生成 — 已加入左側 Artifacts 清單。</span>
      <button
        type="button"
        className={styles.generatedToastPrimary}
        onClick={() => {
          dismiss();
          navigate('/cowork/artifacts');
        }}
      >
        前往 Artifacts
      </button>
      <button type="button" className={styles.generatedToastDismiss} onClick={dismiss}>
        知道了
      </button>
    </div>
  );
}

export { ArtifactPanel };
export default ArtifactPanel;
