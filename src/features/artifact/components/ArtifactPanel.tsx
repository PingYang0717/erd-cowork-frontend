import {
  CheckCircleFilled,
  DownOutlined,
  HistoryOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { Dropdown } from 'antd';
import { useState } from 'react';

import { useSessionSelectionStore } from '@/features/session/store/useSessionSelectionStore';
import { useThemeStore } from '@/features/theme/store/useThemeStore';
import { useMessages } from '@/features/thread/hooks/useMessages';
import type { ArtifactTheme, ArtifactVersion } from '@/types/api';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

import { useArtifactContent } from '../hooks/useArtifactContent';
import { useArtifacts } from '../hooks/useArtifacts';
import { useArtifactVersions } from '../hooks/useArtifactVersions';
import { ArtifactFrame } from './ArtifactFrame';
import styles from './ArtifactPanel.module.css';
import { ShareArtifactDialog } from './ShareArtifactDialog';

export function ArtifactPanel() {
  const selectedSessionId = useSessionSelectionStore((s) => s.selectedSessionId);

  if (!selectedSessionId) {
    return <div className={styles.empty}>Ask a question to generate an Artifact.</div>;
  }

  return <ArtifactPanelView sessionId={selectedSessionId} />;
}

function ArtifactPanelView({ sessionId }: { sessionId: string }) {
  const { data: messages } = useMessages(sessionId);

  const latestArtifactMessage = [...(messages ?? [])].reverse().find((m) => m.artifactId);
  const artifactId = latestArtifactMessage?.artifactId;

  if (!artifactId) {
    return <div className={styles.empty}>Ask a question to generate an Artifact.</div>;
  }

  return <ArtifactPanelContent key={artifactId} artifactId={artifactId} />;
}

function ArtifactPanelContent({ artifactId }: { artifactId: string }) {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const theme: ArtifactTheme = isDarkMode ? 'dark' : 'light';

  const [versionId, setVersionId] = useState<string | undefined>(undefined);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { data: versions } = useArtifactVersions(artifactId);
  const { data } = useArtifactContent(artifactId, theme, versionId);
  const { data: artifacts } = useArtifacts();
  const artifact = artifacts?.find((a) => a.id === artifactId);

  if (!data) {
    return <div className={styles.empty}>Ask a question to generate an Artifact.</div>;
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
      </div>
      <div className={styles.frameWrapper}>
        <ArtifactFrame html={data.html} theme={theme} />
      </div>
      {artifact && (
        <ShareArtifactDialog
          open={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          artifactId={artifact.id}
          artifactName={artifact.name}
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
