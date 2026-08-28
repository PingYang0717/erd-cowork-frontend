import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { DRAFT_SESSION_TITLE } from '@/constants/messages';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import type { Session, SessionDetail } from '@/types/api/session';

import { sessionDetailQueryKey } from './useSessionDetail';
import { useSessions } from './useSessions';

export function sortByRecency(sessions: Session[]) {
  return [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** The shell a draft's thread reads until its first message lands. Its title MUST match
 *  what the backend names a new session, or the rail label changes under the user the
 *  moment the session becomes real. */
function emptySessionDetail(id: string, createdAt: string): SessionDetail {
  return { id, title: DRAFT_SESSION_TITLE, createdAt, messages: [], files: [] };
}

export function useSessionGroups() {
  const { data } = useSessions();
  // Stable identity: the landing effect below depends on this list, and `data ?? []`
  // would hand it a new array on every render.
  const sessions = useMemo(() => data ?? [], [data]);

  const selectedSessionId = useSessionSelectionStore((s) => s.selectedSessionId);
  const draftStartedAt = useSessionSelectionStore((s) => s.draftStartedAt);
  const selectSession = useSessionSelectionStore((s) => s.selectSession);
  const startDraft = useSessionSelectionStore((s) => s.startDraft);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // A draft is "the selection the server has never heard of". Derived rather than
  // stored, so the entry disappears by itself the moment the first message persists it.
  const isDraftActive =
    selectedSessionId !== null &&
    draftStartedAt !== null &&
    !sessions.some((session) => session.id === selectedSessionId);

  const draftSession: Session | null =
    isDraftActive && selectedSessionId !== null && draftStartedAt !== null
      ? {
          id: selectedSessionId,
          title: DRAFT_SESSION_TITLE,
          pinnedAt: null,
          updatedAt: draftStartedAt,
        }
      : null;

  const pinned = sortByRecency(sessions.filter((session) => session.pinnedAt !== null));
  // No special case for the draft's position: its updatedAt is the moment it was
  // opened, so recency ordering already puts it first.
  const recent = sortByRecency([
    ...sessions.filter((session) => session.pinnedAt === null),
    ...(draftSession ? [draftSession] : []),
  ]);

  /** Seeds a draft and selects it, without moving the user anywhere. */
  const openDraft = useCallback(() => {
    const draftSessionId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    queryClient.setQueryData(
      sessionDetailQueryKey(draftSessionId),
      emptySessionDetail(draftSessionId, startedAt),
    );
    startDraft(draftSessionId, startedAt);
  }, [queryClient, startDraft]);

  // Landing: with nothing selected the Studio is an empty shell with a composer the user
  // cannot reach, and the click that fixes it carries no decision. Open the most recent
  // conversation, or a draft when there is none. Runs once — it sets the selection.
  useEffect(() => {
    if (selectedSessionId !== null) {
      return;
    }
    const mostRecent = sortByRecency(sessions)[0];
    if (mostRecent) {
      selectSession(mostRecent.id);
      return;
    }
    openDraft();
  }, [selectedSessionId, sessions, selectSession, openDraft]);

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

  /** Opens a draft session. The backend has no POST /sessions — the id is this client's
   *  to invent, and the first message upserts it (ADR-0005). Pressing New chat while a
   *  draft is already open does nothing but bring it into view: seeding a second shell
   *  would leave the first orphaned in the cache. */
  function createAndNavigate() {
    if (isDraftActive) {
      navigate('/cowork');
      return;
    }
    openDraft();
    navigate('/cowork');
  }

  return {
    pinned,
    recent,
    draftSessionId: draftSession?.id ?? null,
    selectedSessionId,
    selectAndNavigate,
    createAndNavigate,
  };
}
