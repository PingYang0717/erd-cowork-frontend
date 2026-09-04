import React, { useCallback } from 'react';
import { Outlet } from 'react-router-dom';

import DataBoundary from '@/components/common/DataBoundary';
import SettingsMenu from '@/components/common/SettingsMenu';
import CollapsedSessionRail from '@/components/session/CollapsedSessionRail';
import SessionList from '@/components/session/SessionList';
import { useArtifacts } from '@/hooks/useArtifacts';
import { useResizablePane } from '@/hooks/useResizablePane';
import {
  SESSION_RAIL_COLLAPSED_WIDTH,
  SESSION_RAIL_MAX_WIDTH,
  SESSION_RAIL_MIN_WIDTH,
  useStudioLayoutStore,
} from '@/stores/useStudioLayoutStore';
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

  const readRailWidth = useCallback(() => useStudioLayoutStore.getState().sessionRailWidth, []);
  const { paneRef, onDragStart, onDrag, onDragEnd } = useResizablePane<HTMLElement>({
    min: SESSION_RAIL_MIN_WIDTH,
    max: SESSION_RAIL_MAX_WIDTH,
    read: readRailWidth,
    commit: setSessionRailWidth,
  });

  const railWidth = isSessionRailCollapsed ? SESSION_RAIL_COLLAPSED_WIDTH : sessionRailWidth;

  return (
    <div className={styles.shell}>
      <nav ref={paneRef} aria-label="Session list" className={styles.sessionRail} style={{ width: railWidth }}>
        {/* BOTH branches sit behind the boundary: the collapsed rail reads the same
            suspense query (useSessionGroups → useSessions), and the collapse state is
            persisted now — so "reload while collapsed" is an ordinary path, and without
            a boundary here a failing sessions fetch had nothing above it to catch:
            the whole page went blank. */}
        <div className={styles.railContent}>
          <DataBoundary label="Sessions">
            {isSessionRailCollapsed ? (
              <CollapsedSessionRail onExpand={toggleSessionRailCollapsed} />
            ) : (
              <ExpandedSessionRail onCollapse={toggleSessionRailCollapsed} />
            )}
          </DataBoundary>
        </div>
        {/* OUTSIDE the boundary, deliberately: settings is where the language lives,
            and a reader facing a failed pane in a language they cannot read needs
            this entry to survive exactly that failure. It used to sit inside the
            rail components, behind the very query whose error card replaced it. */}
        <div className={styles.railSettings}>
          <SettingsMenu variant={isSessionRailCollapsed ? 'tile' : 'rail'} />
        </div>
      </nav>

      {!isSessionRailCollapsed && (
        <ResizeHandle
          label="Resize session rail"
          value={sessionRailWidth}
          min={SESSION_RAIL_MIN_WIDTH}
          max={SESSION_RAIL_MAX_WIDTH}
          onDragStart={onDragStart}
          onDrag={onDrag}
          onDragEnd={onDragEnd}
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
