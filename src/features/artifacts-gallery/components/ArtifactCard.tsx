import {
  DashboardOutlined,
  FilePptOutlined,
  PushpinFilled,
  PushpinOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';

import { useSetArtifactPinned } from '@/features/artifact/hooks/useArtifactMutations';
import type { Artifact } from '@/types/api';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

import styles from './ArtifactCard.module.css';

export function ArtifactCard({
  artifact,
  onOpen,
}: {
  artifact: Artifact;
  onOpen: (artifact: Artifact) => void;
}) {
  const setArtifactPinned = useSetArtifactPinned();

  return (
    <div className={styles.card} role="listitem">
      <button type="button" className={styles.open} onClick={() => onOpen(artifact)}>
        <span className={styles.thumbnail} aria-hidden="true">
          {artifact.kind === 'slides' ? (
            <FilePptOutlined className={styles.thumbnailIcon} />
          ) : (
            <DashboardOutlined className={styles.thumbnailIcon} />
          )}
        </span>
        <span className={styles.body}>
          <span className={styles.titleRow}>
            <span className={styles.name}>{artifact.name}</span>
            <span className={styles.kindTag} aria-hidden="true">
              {artifact.kind === 'slides' ? 'Deck' : 'Dash'}
            </span>
          </span>
          <span className={styles.metaRow} aria-hidden="true">
            <span className={styles.time}>{formatRelativeTime(artifact.createdAt)}</span>
            {artifact.sharedBy && (
              <span className={styles.sharedByBadge}>
                <UsergroupAddOutlined /> {artifact.sharedBy}
              </span>
            )}
          </span>
        </span>
      </button>
      <button
        type="button"
        className={styles.pinButton}
        aria-label={artifact.pinned ? `Unpin ${artifact.name}` : `Pin ${artifact.name}`}
        aria-pressed={artifact.pinned}
        onClick={() => setArtifactPinned.mutate({ id: artifact.id, pinned: !artifact.pinned })}
      >
        {artifact.pinned ? <PushpinFilled aria-hidden /> : <PushpinOutlined aria-hidden />}
      </button>
    </div>
  );
}
