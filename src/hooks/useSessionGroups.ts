import { useNavigate } from 'react-router-dom';

import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import type { Session } from '@/types/api/session';

import { useCreateSession } from './useSessionMutations';
import { useSessions } from './useSessions';

export function sortByRecency(sessions: Session[]) {
  return [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function useSessionGroups() {
  const { data } = useSessions();
  const sessions = data ?? [];
  const pinned = sortByRecency(sessions.filter((session) => session.pinned));
  const recent = sortByRecency(sessions.filter((session) => !session.pinned));

  const selectedSessionId = useSessionSelectionStore((s) => s.selectedSessionId);
  const selectSession = useSessionSelectionStore((s) => s.selectSession);
  const createSession = useCreateSession();
  const navigate = useNavigate();

  // Selecting (or creating) a session should always bring the Studio thread
  // into view — matching the mockup's cwSelectSession, which resets cwView
  // to "studio" (line 11050). Without this, selecting a session while on
  // /cowork/artifacts or /cowork/schedule silently updates the store with
  // nothing visibly changing, since the Outlet there isn't showing the
  // thread at all.
  function selectAndNavigate(id: string) {
    selectSession(id);
    navigate('/cowork');
  }

  function createAndNavigate() {
    createSession.mutate();
    navigate('/cowork');
  }

  return { pinned, recent, selectedSessionId, selectAndNavigate, createAndNavigate };
}
