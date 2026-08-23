import {
  AppstoreOutlined,
  CheckCircleFilled,
  CheckOutlined,
  DownOutlined,
  ExportOutlined,
  HistoryOutlined,
  ReloadOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { Dropdown } from 'antd';
import { useState } from 'react';

import { Tooltip } from '@/components/Tooltip';
import { useSessionSelectionStore } from '@/features/session/store/useSessionSelectionStore';
import { useMessages } from '@/features/thread/hooks/useMessages';
import type { ArtifactVersion } from '@/types/api';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

import { useArtifactContent } from '../hooks/useArtifactContent';
import { useGenerateArtifactVersion, useRegenerateArtifact } from '../hooks/useArtifactMutations';
import { useArtifacts } from '../hooks/useArtifacts';
import { useArtifactTheme } from '../hooks/useArtifactTheme';
import { useArtifactVersions } from '../hooks/useArtifactVersions';
import { ArtifactFrame } from './ArtifactFrame';
import styles from './ArtifactPanel.module.css';
import { ShareArtifactDialog } from './ShareArtifactDialog';

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

export function ArtifactPanel() {
  const selectedSessionId = useSessionSelectionStore((s) => s.selectedSessionId);

  if (!selectedSessionId) {
    return <EmptyPanel />;
  }

  return <ArtifactPanelView sessionId={selectedSessionId} />;
}

function ArtifactPanelView({ sessionId }: { sessionId: string }) {
  const { data: messages } = useMessages(sessionId);

  const latestArtifactMessage = [...(messages ?? [])].reverse().find((m) => m.artifactId);
  const artifactId = latestArtifactMessage?.artifactId;

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
                generateVersion.mutate({ id: artifactId, versionId: activeVersion.id })
              }
            >
              生成 Artifact
            </button>
          ))}
        <button
          type="button"
          className={styles.shareButton}
          aria-label={artifact?.shared ? 'Artifact shared' : 'Share artifact'}
          title="分享"
          onClick={() => setIsShareOpen(true)}
        >
          <ShareAltOutlined aria-hidden />
          {artifact?.shared && <CheckCircleFilled aria-hidden className={styles.sharedIndicator} />}
        </button>
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
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Open artifact in new tab"
          title="在新分頁開啟"
          onClick={() =>
            window.open(`/cowork/artifact/${artifactId}`, '_blank', 'noopener,noreferrer')
          }
        >
          <ExportOutlined aria-hidden />
        </button>
      </div>
      <div className={styles.frameWrapper}>
        <ArtifactFrame html={data.html} theme={theme} />
      </div>
      {artifact && (
        <ShareArtifactDialog
          open={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          artifact={artifact}
        />
      )}
    </div>
  );
}

function VersionSwitcher({
  versions,
  activeVersion,
  onSelect,
}: {
  versions: ArtifactVersion[];
  activeVersion: ArtifactVersion | undefined;
  onSelect: (id: string) => void;
}) {
  const items = [...versions].reverse().map((v) => ({
    key: v.id,
    label: (
      <span className={styles.versionMenuItem}>
        <span className={styles.versionMenuItemN}>v{v.n}</span>
        <span className={styles.versionMenuItemLabel}>{v.label}</span>
        <span className={styles.versionMenuItemTime}>{formatRelativeTime(v.createdAt)}</span>
      </span>
    ),
  }));

  return (
    <Dropdown trigger={['click']} menu={{ items, onClick: ({ key }) => onSelect(key) }}>
      <button type="button" className={styles.versionTrigger} title="切換版本">
        <HistoryOutlined aria-hidden />
        <span className={styles.versionTriggerN}>v{activeVersion?.n ?? 1}</span>
        <span className={styles.versionTriggerLabel}>{activeVersion?.label ?? ''}</span>
        <DownOutlined aria-hidden className={styles.versionTriggerChevron} />
      </button>
    </Dropdown>
  );
}
