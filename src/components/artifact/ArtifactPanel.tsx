import {
  AppstoreOutlined,
  CheckOutlined,
  ExportOutlined,
  ReloadOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Tooltip } from '@/components/common/Tooltip';
import { useArtifactContent } from '@/hooks/useArtifactContent';
import { useGenerateArtifactVersion, useRegenerateArtifact } from '@/hooks/useArtifactMutations';
import { useArtifacts } from '@/hooks/useArtifacts';
import { useArtifactTheme } from '@/hooks/useArtifactTheme';
import { useArtifactVersions } from '@/hooks/useArtifactVersions';
import { useSessionDetail } from '@/hooks/useSessionDetail';
import { useActiveRunStore } from '@/stores/useActiveRunStore';
import { useGenerateCoachStore } from '@/stores/useGenerateCoachStore';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';

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

  return <ArtifactPanelView sessionId={selectedSessionId} />;
};

function ArtifactPanelView({ sessionId }: { sessionId: string }) {
  const { data: detail } = useSessionDetail(sessionId);
  const streamedArtifactId = useActiveRunStore((s) => s.streamedArtifactId);

  // A run in progress wins: it has just produced this Artifact, and waiting for the
  // thread history to refetch would leave the pane showing the previous one.
  const latestArtifactMessage = [...detail.messages].reverse().find((m) => m.artifactId);
  const artifactId = streamedArtifactId ?? latestArtifactMessage?.artifactId;

  if (!artifactId) {
    return <EmptyPanel />;
  }

  return <ArtifactPanelContent key={artifactId} artifactId={artifactId} />;
}

function ArtifactPanelContent({ artifactId }: { artifactId: string }) {
  const theme = useArtifactTheme();

  const [versionId, setVersionId] = useState<string | undefined>(undefined);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { data: versions } = useArtifactVersions(artifactId);
  const { data } = useArtifactContent(artifactId, theme, versionId);
  const { data: artifacts } = useArtifacts();
  const artifact = artifacts?.find((a) => a.id === artifactId);
  const regenerateArtifact = useRegenerateArtifact();
  const generateVersion = useGenerateArtifactVersion();
  const startCoach = useGenerateCoachStore((s) => s.start);

  if (!data) {
    return <EmptyPanel />;
  }

  const activeVersion =
    versions?.find((v) => v.id === versionId) ?? versions?.[versions.length - 1];

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        {versions && versions.length > 0 && (
          <VersionSwitcher
            versions={versions}
            activeVersion={activeVersion}
            onSelect={setVersionId}
          />
        )}
        {activeVersion &&
          (activeVersion.generated ? (
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
              disabled={generateVersion.isPending}
              onClick={() =>
                generateVersion.mutate(
                  { id: artifactId, versionId: activeVersion.id },
                  { onSuccess: startCoach },
                )
              }
            >
              生成 Artifact
            </button>
          ))}
        <Tooltip
          content={activeVersion?.generated ? '分享' : '請先生成 Artifact'}
          wrapperClassName={styles.shareButtonSlot}
        >
          <button
            type="button"
            className={styles.shareButton}
            aria-label="Share artifact"
            disabled={!activeVersion?.generated}
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
            disabled={regenerateArtifact.isPending}
            onClick={() =>
              regenerateArtifact.mutate(artifactId, { onSuccess: () => setVersionId(undefined) })
            }
          >
            <ReloadOutlined aria-hidden spin={regenerateArtifact.isPending} />
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
        <ArtifactFrame html={data.html} theme={theme} artifactId={artifactId} />
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
