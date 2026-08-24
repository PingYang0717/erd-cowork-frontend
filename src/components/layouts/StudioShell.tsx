import { Outlet } from 'react-router-dom';

import { CollapsedSessionRail } from '@/components/session/CollapsedSessionRail';
import { SessionList } from '@/components/session/SessionList';
import { useArtifacts } from '@/hooks/useArtifacts';
import { SESSION_RAIL_COLLAPSED_WIDTH, useStudioLayoutStore } from '@/stores/useStudioLayoutStore';

import { ResizeHandle } from './ResizeHandle';
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

  const railWidth = isSessionRailCollapsed ? SESSION_RAIL_COLLAPSED_WIDTH : sessionRailWidth;

  return (
    <div className={styles.shell}>
      <nav aria-label="Session list" className={styles.sessionRail} style={{ width: railWidth }}>
        {isSessionRailCollapsed ? (
          <CollapsedSessionRail onExpand={toggleSessionRailCollapsed} />
        ) : (
          <SessionList
            onCollapse={toggleSessionRailCollapsed}
            artifactsCount={artifacts?.filter((a) => a.generated).length ?? 0}
          />
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
        <Outlet />
      </div>
    </div>
  );
}
