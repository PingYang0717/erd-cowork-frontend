import React from 'react';

import ArtifactPanel from '@/components/artifact/ArtifactPanel';
import ThreadPanel from '@/components/chat/ThreadPanel';
import DataBoundary from '@/components/common/DataBoundary';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';

import ResizeHandle from './ResizeHandle';
import styles from './StudioLayout.module.css';

// The thread + Artifact panel two-pane layout — mounted as the /cowork
// index route's content inside StudioShell's session rail + <Outlet/>.
const StudioLayout: React.FC = () => {
  const threadWidth = useStudioLayoutStore((s) => s.threadWidth);
  const setThreadWidth = useStudioLayoutStore((s) => s.setThreadWidth);

  return (
    <div className={styles.studio}>
      <section aria-label="Thread" className={styles.thread} style={{ width: threadWidth }}>
        <DataBoundary label="Thread">
          <ThreadPanel />
        </DataBoundary>
      </section>

      <ResizeHandle
        label="Resize thread panel"
        onDrag={(deltaX) => setThreadWidth(useStudioLayoutStore.getState().threadWidth + deltaX)}
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
