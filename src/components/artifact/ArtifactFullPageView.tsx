import {
  ArrowLeftOutlined,
  ExportOutlined,
  HomeOutlined,
  ReloadOutlined,
  ShareAltOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import ThemeToggle from '@/components/common/ThemeToggle';
import Tooltip from '@/components/common/Tooltip';
import { useArtifactContent } from '@/hooks/useArtifactContent';
import { artifactContentQueryKey } from '@/hooks/useArtifactContent';
import { useArtifacts } from '@/hooks/useArtifacts';
import { useSessionDetail } from '@/hooks/useSessionDetail';
import type { Artifact, ArtifactVersion } from '@/types/api/index';
import { artifactHref } from '@/utils/artifactUrl';
import { deriveArtifactVersions } from '@/utils/deriveArtifactVersions';

import ArtifactFrame from './ArtifactFrame';
import styles from './ArtifactFullPageView.module.css';
import ShareArtifactDialog from './ShareArtifactDialog';
import VersionSwitcher from './VersionSwitcher';

// Where the viewer came from, recorded as router state by in-app navigations
// (the gallery card sets 'gallery'). A direct open — a shared link, or the
// Studio panel's open-in-new-tab — carries no state and falls back to Home.
interface FullPageLocationState {
  from?: 'gallery' | 'studio';
}

interface ArtifactFullPageViewProps {
  artifactId: string | undefined;
}

const ArtifactFullPageView: React.FC<ArtifactFullPageViewProps> = ({ artifactId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { data: artifacts } = useArtifacts();
  const routeArtifact = artifacts?.find((a) => a.id === artifactId);

  // Versions are the artifact-bearing messages of the artifact's own session, so
  // the switcher can jump between sibling artifacts (each version IS an artifact).
  const displayedArtifactId = selectedArtifactId ?? artifactId;
  const displayedArtifact = artifacts?.find((a) => a.id === displayedArtifactId);
  const { data, isError } = useArtifactContent(displayedArtifactId);

  const origin = (location.state as FullPageLocationState | null)?.from;

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
          {routeArtifact && !routeArtifact.isOwn ? (
            <div className={styles.sharedToMeHeader} aria-label="Shared to me">
              <UsergroupAddOutlined aria-hidden className={styles.sharedToMeIcon} />
              <span className={styles.sharedToMeName}>{routeArtifact.ownerDisplay}</span>
              <span className={styles.sharedToMeBadge}>Shared to me</span>
            </div>
          ) : (
            routeArtifact && (
              <SessionVersionSwitcher
                artifact={routeArtifact}
                artifacts={artifacts ?? []}
                displayedArtifactId={displayedArtifactId}
                onSelect={setSelectedArtifactId}
              />
            )
          )}
        </div>

        <Tooltip content="分享">
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
            aria-label="Refresh artifact"
            onClick={() => {
              if (displayedArtifactId !== undefined) {
                queryClient.invalidateQueries({
                  queryKey: artifactContentQueryKey(displayedArtifactId),
                });
              }
            }}
          >
            <ReloadOutlined aria-hidden />
          </button>
        </Tooltip>
        <Tooltip content="在新分頁開啟預覽">
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Open artifact in new tab"
            onClick={() => {
              // The toolbar only renders alongside a displayed artifact, but the type
              // cannot see that — and opening a tab at /undefined would be silent.
              if (displayedArtifactId !== undefined) {
                window.open(artifactHref(displayedArtifactId), '_blank', 'noopener,noreferrer');
              }
            }}
          >
            <ExportOutlined aria-hidden />
          </button>
        </Tooltip>
        <ThemeToggle />
      </div>
      <div className={styles.body}>
        {isError && <div className={styles.empty}>Artifact not found.</div>}
        {data && displayedArtifactId && (
          <ArtifactFrame html={data} artifactId={displayedArtifactId} />
        )}
      </div>
      {displayedArtifact && (
        <ShareArtifactDialog
          open={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          artifact={displayedArtifact}
        />
      )}
    </div>
  );
};

/** Loads the artifact's session to derive its version list — its own component so the
 *  session query only runs when there is an owned artifact to derive from. */
interface SessionVersionSwitcherProps {
  artifact: Artifact;
  artifacts: Artifact[];
  displayedArtifactId: string | undefined;
  onSelect: (artifactId: string) => void;
}

const SessionVersionSwitcher: React.FC<SessionVersionSwitcherProps> = ({
  artifact,
  artifacts,
  displayedArtifactId,
  onSelect,
}) => {
  const { data: detail } = useSessionDetail(artifact.sessionId);

  const versions = useMemo<ArtifactVersion[]>(
    () =>
      deriveArtifactVersions(detail.messages).map((version) => ({
        ...version,
        publishedAt: artifacts.find((a) => a.id === version.artifactId)?.publishedAt,
      })),
    [detail.messages, artifacts],
  );

  if (versions.length === 0) {
    return null;
  }

  const activeVersion =
    versions.find((v) => v.artifactId === displayedArtifactId) ?? versions[versions.length - 1];

  return <VersionSwitcher versions={versions} activeVersion={activeVersion} onSelect={onSelect} />;
};

export default ArtifactFullPageView;
