import { ArtifactPanel } from '@/features/artifact/components/ArtifactPanel';
import { ThreadPanel } from '@/features/thread/components/ThreadPanel';

import { useHorizontalDrag } from '../hooks/useHorizontalDrag';
import { useStudioLayoutStore } from '../store/useStudioLayoutStore';
import styles from './StudioLayout.module.css';

// The thread + Artifact panel two-pane layout — mounted as the /cowork
// index route's content inside StudioShell's session rail + <Outlet/>.
export function StudioLayout() {
  const threadWidth = useStudioLayoutStore((s) => s.threadWidth);
  const setThreadWidth = useStudioLayoutStore((s) => s.setThreadWidth);

  const handleThreadResizeStart = useHorizontalDrag((deltaX) =>
    setThreadWidth(useStudioLayoutStore.getState().threadWidth + deltaX),
  );

  return (
    <div className={styles.studio}>
      <section aria-label="Thread" className={styles.thread} style={{ width: threadWidth }}>
        <ThreadPanel />
      </section>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize thread panel"
        className={styles.resizeHandle}
        onMouseDown={handleThreadResizeStart}
      />

      <section aria-label="Artifact panel" className={styles.artifactPanel}>
        <ArtifactPanel />
      </section>
    </div>
  );
}
