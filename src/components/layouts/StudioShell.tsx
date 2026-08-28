import React from 'react';
import { Outlet } from 'react-router-dom';

import DataBoundary from '@/components/common/DataBoundary';
import CollapsedSessionRail from '@/components/session/CollapsedSessionRail';
import SessionList from '@/components/session/SessionList';
import { useArtifacts } from '@/hooks/useArtifacts';
import { SESSION_RAIL_COLLAPSED_WIDTH, useStudioLayoutStore } from '@/stores/useStudioLayoutStore';

import ResizeHandle from './ResizeHandle';
import styles from './StudioShell.module.css';

// The Cowork app shell: the session rail persists across Studio, Artifacts,
// and Schedule (only the single-Artifact full-page view, routed separately
// in router.tsx, hides it) — matching the rail's role in the original
// mockup, where switching cwView never unmounted it.
// Split out so the shell itself never suspends: the rail is what needs data, and it
// sits inside its own boundary.
interface ExpandedSessionRailProps {
  onCollapse: () => void;
}

const ExpandedSessionRail: React.FC<ExpandedSessionRailProps> = ({ onCollapse }) => {
  const { data: artifacts } = useArtifacts();

  return (
    <SessionList
      onCollapse={onCollapse}
      artifactsCount={artifacts.filter((artifact) => artifact.publishedAt !== null).length}
    />
  );
};

const StudioShell: React.FC = () => {
  const sessionRailWidth = useStudioLayoutStore((s) => s.sessionRailWidth);
  const isSessionRailCollapsed = useStudioLayoutStore((s) => s.isSessionRailCollapsed);
  const setSessionRailWidth = useStudioLayoutStore((s) => s.setSessionRailWidth);
  const toggleSessionRailCollapsed = useStudioLayoutStore((s) => s.toggleSessionRailCollapsed);

  const railWidth = isSessionRailCollapsed ? SESSION_RAIL_COLLAPSED_WIDTH : sessionRailWidth;

  return (
    <div className={styles.shell}>
      <nav aria-label="Session list" className={styles.sessionRail} style={{ width: railWidth }}>
        {isSessionRailCollapsed ? (
          <CollapsedSessionRail onExpand={toggleSessionRailCollapsed} />
        ) : (
          <DataBoundary label="Sessions">
            <ExpandedSessionRail onCollapse={toggleSessionRailCollapsed} />
          </DataBoundary>
        )}
      </nav>

      {!isSessionRailCollapsed && (
        <ResizeHandle
          label="Resize session rail"
          onDrag={(deltaX) =>
            setSessionRailWidth(useStudioLayoutStore.getState().sessionRailWidth + deltaX)
          }
        />
      )}

      <div className={styles.content}>
        <DataBoundary label="Content">
          <Outlet />
        </DataBoundary>
      </div>
    </div>
  );
};

export default StudioShell;
