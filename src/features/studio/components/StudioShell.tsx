import { Outlet } from 'react-router-dom';

import { useArtifacts } from '@/features/artifact/hooks/useArtifacts';
import { SessionList } from '@/features/session/components/SessionList';

import { useHorizontalDrag } from '../hooks/useHorizontalDrag';
import { SESSION_RAIL_COLLAPSED_WIDTH, useStudioLayoutStore } from '../store/useStudioLayoutStore';
import { CollapsedSessionRail } from './CollapsedSessionRail';
import styles from './StudioShell.module.css';

// The Cowork app shell: the session rail persists across Studio, Artifacts,
// and Schedule (only the single-Artifact full-page view, routed separately
// in router.tsx, hides it) — matching the rail's role in the original
// mockup, where switching cwView never unmounted it.
export function StudioShell() {
  const sessionRailWidth = useStudioLayoutStore((s) => s.sessionRailWidth);
  const isSessionRailCollapsed = useStudioLayoutStore((s) => s.isSessionRailCollapsed);
  const setSessionRailWidth = useStudioLayoutStore((s) => s.setSessionRailWidth);
  const toggleSessionRailCollapsed = useStudioLayoutStore((s) => s.toggleSessionRailCollapsed);
  const { data: artifacts } = useArtifacts();

  const handleRailResizeStart = useHorizontalDrag((deltaX) =>
    setSessionRailWidth(useStudioLayoutStore.getState().sessionRailWidth + deltaX),
  );

  const railWidth = isSessionRailCollapsed ? SESSION_RAIL_COLLAPSED_WIDTH : sessionRailWidth;

  return (
    <div className={styles.shell}>
      <nav aria-label="Session list" className={styles.sessionRail} style={{ width: railWidth }}>
        {isSessionRailCollapsed ? (
          <CollapsedSessionRail onExpand={toggleSessionRailCollapsed} />
        ) : (
          <SessionList
            onCollapse={toggleSessionRailCollapsed}
            artifactsCount={artifacts?.length ?? 0}
          />
        )}
      </nav>

      {!isSessionRailCollapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize session rail"
          className={styles.resizeHandle}
          onMouseDown={handleRailResizeStart}
        />
      )}

      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
