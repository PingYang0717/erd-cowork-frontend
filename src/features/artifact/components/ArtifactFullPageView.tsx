import {
  ArrowLeftOutlined,
  ExportOutlined,
  HomeOutlined,
  ReloadOutlined,
  ShareAltOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Tooltip } from '@/components/Tooltip';
import { ThemeToggle } from '@/features/theme/components/ThemeToggle';

import { useArtifactContent } from '../hooks/useArtifactContent';
import { artifactQueryKey, useArtifacts } from '../hooks/useArtifacts';
import { useArtifactTheme } from '../hooks/useArtifactTheme';
import { useArtifactVersions } from '../hooks/useArtifactVersions';
import { ArtifactFrame } from './ArtifactFrame';
import styles from './ArtifactFullPageView.module.css';
import { ShareArtifactDialog } from './ShareArtifactDialog';
import { VersionSwitcher } from './VersionSwitcher';

// Where the viewer came from, recorded as router state by in-app navigations
// (the gallery card sets 'gallery'). A direct open — a shared link, or the
// Studio panel's open-in-new-tab — carries no state and falls back to Home.
interface FullPageLocationState {
  from?: 'gallery' | 'studio';
}

export function ArtifactFullPageView({ artifactId }: { artifactId: string | undefined }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const theme = useArtifactTheme();

  const [versionId, setVersionId] = useState<string | undefined>(undefined);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { data, isError } = useArtifactContent(artifactId, theme, versionId);
  const { data: versions } = useArtifactVersions(artifactId);
  const { data: artifacts } = useArtifacts();
  const artifact = artifacts?.find((a) => a.id === artifactId);

  const origin = (location.state as FullPageLocationState | null)?.from;
  const activeVersion =
    versions?.find((v) => v.id === versionId) ?? versions?.[versions.length - 1];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        {origin ? (
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate(origin === 'gallery' ? '/cowork/artifacts' : '/cowork')}
          >
            <ArrowLeftOutlined aria-hidden />
            Back
          </button>
        ) : (
          <button type="button" className={styles.backButton} onClick={() => navigate('/cowork')}>
            <HomeOutlined aria-hidden />
            Home
          </button>
        )}

        <div className={styles.headerCenter}>
          {artifact?.sharedBy ? (
            <div className={styles.sharedToMeHeader} aria-label="Shared to me">
              <UsergroupAddOutlined aria-hidden className={styles.sharedToMeIcon} />
              <span className={styles.sharedToMeName}>{artifact.sharedBy}</span>
              <span className={styles.sharedToMeBadge}>Shared to me</span>
            </div>
          ) : (
            versions &&
            versions.length > 0 && (
              <VersionSwitcher
                versions={versions}
                activeVersion={activeVersion}
                onSelect={setVersionId}
              />
            )
          )}
        </div>

        <Tooltip content={activeVersion?.generated ? '分享' : '請先生成 Artifact'}>
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
        <Tooltip content="重新整理">
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Refresh artifact"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: artifactQueryKey(artifactId as string) })
            }
          >
            <ReloadOutlined aria-hidden />
          </button>
        </Tooltip>
        <Tooltip content="在新分頁開啟">
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
        <ThemeToggle />
      </div>
      <div className={styles.body}>
        {isError && <div className={styles.empty}>Artifact not found.</div>}
        {data && <ArtifactFrame html={data.html} theme={theme} />}
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
