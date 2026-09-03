import {
  ArrowLeftOutlined,
  ExportOutlined,
  HomeOutlined,
  ReloadOutlined,
  ShareAltOutlined,
  UserOutlined,
} from '@ant-design/icons';
import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { isNotFoundError } from '@/api/apiError';
import SettingsMenu from '@/components/common/SettingsMenu';
import { useArtifactContent } from '@/hooks/useArtifactContent';
import { useArtifacts } from '@/hooks/useArtifacts';
import { useTranslations } from '@/i18n/useTranslations';
import { useActiveRunStore } from '@/stores/useActiveRunStore';
import type { Artifact, ArtifactVersion } from '@/types/api';
import { artifactHref } from '@/utils/artifactUrl';

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
  const { data, isError, error } = useArtifactContent(displayedArtifactId, reloadNonce);

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
              {/* One person: this icon sits beside the owner's name, the same mapping
                  the Gallery card uses — the group icon says "shared to me", the single
                  head says "who it came from". */}
              <UserOutlined aria-hidden className={styles.sharedToMeIcon} />
              <span className={styles.sharedToMeName}>{routeArtifact.ownerDisplay}</span>
              <span className={styles.sharedToMeBadge}>{t.studio.sharedToMe}</span>
            </div>
          ) : (
            routeArtifact && (
              // No boundary needed any more: this reads the Artifact it was handed and
              // nothing else. It used to fetch the producing session, which can 404 on a
              // page whose Artifact is perfectly fetchable — a deleted session does not
              // delete what it produced.
              <ArtifactVersions artifact={routeArtifact} onSelect={setSelectedArtifactId} />
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
        <SettingsMenu variant="tile" />
      </div>
      <div className={styles.body}>
        {/* Only a 404 means gone. A 500 or an unreachable backend says nothing about
            whether this Artifact exists, and telling the reader it was deleted is a
            claim they act on by not looking for it again. */}
        {isError && (
          <div className={styles.empty}>
            {isNotFoundError(error) ? t.studio.artifactNotFound : t.artifact.loadFailed}
          </div>
        )}
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
interface ArtifactVersionsProps {
  artifact: Artifact;
  onSelect: (artifactId: string) => void;
}

/** The versions of the Artifact on screen — which today is the Artifact itself.
 *
 *  It used to list everything the producing session made. Those are siblings, not
 *  versions (artifact-model-decisions Q1): each is its own Artifact, and the Studio panel
 *  lists them because there the conversation is the context. Here the reader arrived from
 *  the Gallery at one Artifact, with no conversation on screen — offering its siblings
 *  under a heading about versions conflates two different things.
 *
 *  Real versions — the same analysis re-run over another time range — are Q6, deliberately
 *  not built this round. The switcher stays wired for one entry rather than being taken
 *  out: the selection it feeds is what those versions will move, and this is the shape
 *  they arrive into.
 */
const ArtifactVersions: React.FC<ArtifactVersionsProps> = ({ artifact, onSelect }) => {
  const versions = useMemo<ArtifactVersion[]>(
    () => [
      {
        artifactId: artifact.id,
        title: artifact.title,
        version: artifact.version,
        createdAt: artifact.createdAt,
        publishedAt: artifact.publishedAt,
      },
    ],
    [artifact],
  );

  return <VersionSwitcher versions={versions} activeVersion={versions[0]} onSelect={onSelect} />;
};

export default ArtifactFullPageView;
