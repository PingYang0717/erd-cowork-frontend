import {
  ArrowLeftOutlined,
  ExportOutlined,
  HomeOutlined,
  ReloadOutlined,
  ShareAltOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import React, { Suspense, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import ErrorBoundary from '@/components/common/ErrorBoundary';
import LanguageToggle from '@/components/common/LanguageToggle';
import ThemeToggle from '@/components/common/ThemeToggle';
import { useArtifactContent } from '@/hooks/useArtifactContent';
import { useArtifacts } from '@/hooks/useArtifacts';
import { useSessionDetail } from '@/hooks/useSessionDetail';
import { useTranslations } from '@/i18n/useTranslations';
import { useActiveRunStore } from '@/stores/useActiveRunStore';
import type { Artifact, ArtifactVersion } from '@/types/api';
import { artifactHref } from '@/utils/artifactUrl';
import { deriveArtifactVersions } from '@/utils/deriveArtifactVersions';

import ArtifactFrame from './ArtifactFrame';
import styles from './ArtifactFullPageView.module.css';
import ArtifactToolbarButton, { ARTIFACT_TOOLBAR_LABELS } from './ArtifactToolbarButton';
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
  const t = useTranslations();
  const navigate = useNavigate();
  const location = useLocation();
  // A Reload here means the same thing it does in the Studio panel (ADR-0001):
  // throw the document away and mount a fresh one. The shared nonce is that channel —
  // it feeds the content query key AND the iframe key below, so bumping it both
  // refetches and remounts. Invalidating the content query alone did neither: the
  // HTML never changes, so the refetch returned the same string and React, seeing an
  // unchanged `srcDoc`, left the wedged iframe exactly where it was.
  const reloadNonce = useActiveRunStore((s) => s.artifactReloadNonce);
  const bumpArtifactReload = useActiveRunStore((s) => s.bumpArtifactReload);

  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { data: artifacts } = useArtifacts();
  const routeArtifact = artifacts?.find((a) => a.id === artifactId);

  // Versions are the artifact-bearing messages of the artifact's own session, so
  // the switcher can jump between sibling artifacts (each version IS an artifact).
  const displayedArtifactId = selectedArtifactId ?? artifactId;
  const displayedArtifact = artifacts?.find((a) => a.id === displayedArtifactId);
  const { data, isError } = useArtifactContent(displayedArtifactId, reloadNonce);

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
            {t.studio.back}
          </button>
        ) : (
          <button type="button" className={styles.backButton} onClick={() => navigate('/cowork')}>
            <HomeOutlined aria-hidden />
            {t.studio.home}
          </button>
        )}

        <div className={styles.headerCenter}>
          {routeArtifact && !routeArtifact.isOwn ? (
            <div className={styles.sharedToMeHeader} aria-label="Shared to me">
              <UsergroupAddOutlined aria-hidden className={styles.sharedToMeIcon} />
              <span className={styles.sharedToMeName}>{routeArtifact.ownerDisplay}</span>
              <span className={styles.sharedToMeBadge}>{t.studio.sharedToMe}</span>
            </div>
          ) : (
            routeArtifact && (
              // Its own boundary, falling back to nothing. The switcher reads the
              // producing session, and deleting a session does not delete the Artifacts
              // it produced — so that read can 404 on a page whose Artifact is perfectly
              // fetchable. Without this the page-level boundary caught it and replaced
              // the whole view with a retry screen that could never succeed.
              <ErrorBoundary fallback={() => null}>
                <Suspense fallback={null}>
                  <SessionVersionSwitcher
                    artifact={routeArtifact}
                    artifacts={artifacts ?? []}
                    displayedArtifactId={displayedArtifactId}
                    onSelect={setSelectedArtifactId}
                  />
                </Suspense>
              </ErrorBoundary>
            )
          )}
        </div>

        {/* Sharing is the owner's act on a published Artifact (CONTEXT.md): a personal
            copy cannot be shared onward, and nothing unpublished can be shared at all.
            The Studio panel already gates its Share this way — this view used to let
            both through, disagreeing with its sibling about the same rule. */}
        <ArtifactToolbarButton
          tooltip={
            !displayedArtifact?.isOwn
              ? t.artifact.shareNotOwner
              : displayedArtifact.publishedAt === null
                ? t.artifact.shareBlocked
                : t.artifact.share
          }
          label={ARTIFACT_TOOLBAR_LABELS.share}
          icon={<ShareAltOutlined aria-hidden />}
          className={styles.shareButton}
          disabled={!displayedArtifact?.isOwn || displayedArtifact.publishedAt === null}
          onClick={() => setIsShareOpen(true)}
        />
        <ArtifactToolbarButton
          tooltip={t.artifact.reload}
          label={ARTIFACT_TOOLBAR_LABELS.reload}
          icon={<ReloadOutlined aria-hidden />}
          onClick={bumpArtifactReload}
        />
        <ArtifactToolbarButton
          tooltip={t.artifact.openInNewTab}
          label={ARTIFACT_TOOLBAR_LABELS.openInNewTab}
          icon={<ExportOutlined aria-hidden />}
          onClick={() => {
            // The toolbar only renders alongside a displayed artifact, but the type
            // cannot see that — and opening a tab at /undefined would be silent.
            if (displayedArtifactId !== undefined) {
              window.open(artifactHref(displayedArtifactId), '_blank', 'noopener,noreferrer');
            }
          }}
        />
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <div className={styles.body}>
        {isError && <div className={styles.empty}>{t.studio.artifactNotFound}</div>}
        {data && displayedArtifactId && (
          <ArtifactFrame
            key={`${displayedArtifactId}-${reloadNonce}`}
            html={data}
            artifactId={displayedArtifactId}
          />
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
