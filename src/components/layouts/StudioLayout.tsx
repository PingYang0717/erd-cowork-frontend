import React, { useCallback } from 'react';

import ArtifactPanel from '@/components/artifact/ArtifactPanel';
import ThreadPanel from '@/components/chat/ThreadPanel';
import DataBoundary from '@/components/common/DataBoundary';
import { useResizablePane } from '@/hooks/useResizablePane';
import {
  THREAD_MAX_WIDTH,
  THREAD_MIN_WIDTH,
  useStudioLayoutStore,
} from '@/stores/useStudioLayoutStore';

import ResizeHandle from './ResizeHandle';
import styles from './StudioLayout.module.css';

// The thread + Artifact panel two-pane layout — mounted as the /cowork
// index route's content inside StudioShell's session rail + <Outlet/>.
const StudioLayout: React.FC = () => {
  const threadWidth = useStudioLayoutStore((s) => s.threadWidth);
  const setThreadWidth = useStudioLayoutStore((s) => s.setThreadWidth);

  const readThreadWidth = useCallback(() => useStudioLayoutStore.getState().threadWidth, []);
  const { paneRef, onDragStart, onDrag, onDragEnd } = useResizablePane<HTMLElement>({
    min: THREAD_MIN_WIDTH,
    max: THREAD_MAX_WIDTH,
    read: readThreadWidth,
    commit: setThreadWidth,
  });

  return (
    <div className={styles.studio}>
      <section
        ref={paneRef}
        aria-label="Thread"
        className={styles.thread}
        style={{ width: threadWidth }}
      >
        <DataBoundary label="Thread">
          <ThreadPanel />
        </DataBoundary>
      </section>

      <ResizeHandle
        label="Resize thread panel"
        onDragStart={onDragStart}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
      />

      <section aria-label="Artifact panel" className={styles.artifactPanel}>
        <DataBoundary label="Artifact">
          <ArtifactPanel />
        </DataBoundary>
      </section>
    </div>
  );
};

export default StudioLayout;
