import { ThunderboltFilled } from '@ant-design/icons';
import React, { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import DataBoundary from '@/components/common/DataBoundary';
import LanguageToggle from '@/components/common/LanguageToggle';
import ThemeToggle from '@/components/common/ThemeToggle';
import { type SendInput, useAgentStream } from '@/hooks/useAgentStream';
import { useArtifactRepair } from '@/hooks/useArtifactRepair';
import { useApplyRememberedDataSources } from '@/hooks/useConnectorMutations';
import { useSessionDetail } from '@/hooks/useSessionDetail';
import { useTranslations } from '@/i18n/useTranslations';
import { useActiveRunStore } from '@/stores/useActiveRunStore';
import { useRepairOfferStore } from '@/stores/useRepairOfferStore';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { composeAnswerText } from '@/utils/composeAnswerText';
import { showOptimisticBubble } from '@/utils/optimisticBubble';

import ChatComposer from './ChatComposer';
import MessageList, { type LiveRun } from './MessageList';
import type { Answers } from './QuestionFormCard';
import RepairOfferCard from './RepairOfferCard';
import styles from './ThreadPanel.module.css';

const ThreadHeader: React.FC = () => {
  return (
    <header className={styles.header} aria-label="Thread header">
      <span className={styles.headerTitle}>
        <ThunderboltFilled aria-hidden className={styles.headerIcon} />
        Cowork · Data studio
      </span>
      {/* No data-source chip here: the mockup hard-coded "Inline DB · N5 line", which
          asserted a fact the Connectors panel could flatly contradict (attach WAT,
          drop Inline, and the chip still claimed Inline). What a conversation reads is
          the session's business, and it is already shown where it is decided. */}
      <LanguageToggle />
      <ThemeToggle />
    </header>
  );
};

interface EmptyStateProps {
  heading: string;
  subtitle: ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ heading, subtitle }) => {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyStateIcon}>
        <ThunderboltFilled aria-hidden />
      </div>
      <p className={styles.emptyStateHeading}>{heading}</p>
      <p className={styles.emptyStateSubtitle}>{subtitle}</p>
    </div>
  );
};

/** The thread pane. The header is deliberately outside the boundary below: it carries
 *  the theme toggle and the data-source chip, which have nothing to do with which
 *  conversation is open, and a header that blinks away every time a session loads is a
 *  worse answer than one that stays put. */
const ThreadPanel: React.FC = () => {
  const t = useTranslations();
  const selectedSessionId = useSessionSelectionStore((s) => s.selectedSessionId);

  return (
    <div className={styles.panel}>
      <ThreadHeader />
      {selectedSessionId ? (
        // Keyed on the session: every piece of state below belongs to one conversation —
        // the open stream, the optimistic bubble, each recap's expanded flag. Remounting
        // is one line where clearing them individually is five, and the five drift.
        <DataBoundary label="Thread">
          <ThreadView key={selectedSessionId} sessionId={selectedSessionId} />
        </DataBoundary>
      ) : (
        <div className={styles.body}>
          <EmptyState
            heading={t.studio.emptyNoSessionHeading}
            subtitle={t.studio.emptyNoSessionSubtitle}
          />
        </div>
      )}
    </div>
  );
};

interface ThreadViewProps {
  sessionId: string;
}

const ThreadView: React.FC<ThreadViewProps> = ({ sessionId }) => {
  const t = useTranslations();
  const { data: detail } = useSessionDetail(sessionId);
  const messages = detail.messages;
  const { state, send, stop } = useAgentStream(sessionId);
  const setStreamedArtifact = useActiveRunStore((s) => s.setStreamedArtifact);
  const setRunStreaming = useActiveRunStore((s) => s.setRunStreaming);
  const displayedArtifactId = useActiveRunStore((s) => s.displayedArtifactId);
  // The user's words go on screen the moment they send; cleared once the refetched
  // history carries them (streaming flips false after the hook's await-then-DONE).
  // The optimistically-shown message plus the history length at the moment it was sent:
  // the bubble is suppressed once the refetched history has grown past `atLength` — i.e.
  // now carries it. Comparing lengths, not text, is what makes sending the same words
  // twice in a row show two bubbles (an equal last-history text would falsely suppress).
  const [pending, setPending] = useState<{ text: string; atLength: number } | null>(null);
  /** What the screen reader hears when a run finishes: the complete reply, once. The
   *  thread itself is aria-live="off" (every token used to be re-read; A-1), so this
   *  sr-only region is the one place a finished answer is announced from. */
  const [announcement, setAnnouncement] = useState('');
  const prevStreamingRef = useRef(false);
  useEffect(() => {
    if (prevStreamingRef.current && !state.isStreaming) {
      setPending(null);
      setAnnouncement(state.liveText || state.answer || '');
    }
    prevStreamingRef.current = state.isStreaming;
    // liveText/answer are stable once streaming has ended; the transition guard makes
    // the extra runs their presence in deps causes no-ops.
  }, [state.isStreaming, state.liveText, state.answer]);
  const repairOffer = useRepairOfferStore((store) => store.offer);
  const dismissRepair = useRepairOfferStore((store) => store.dismiss);
  const resetRepair = useRepairOfferStore((store) => store.reset);
  const repair = useArtifactRepair();
  const applyRememberedDataSources = useApplyRememberedDataSources(sessionId);

  // An offer belongs to one artifact in one session. Moving away from that session
  // leaves it pointing at something the user is no longer looking at.
  useEffect(() => resetRepair, [sessionId, resetRepair]);

  // The Artifact pane refuses a Reload while a run is open; like the artifact itself
  // this is state another tree needs, so it goes through the store.
  const isRunStreaming = state.isStreaming;
  useEffect(() => {
    setRunStreaming(isRunStreaming);
    return () => setRunStreaming(false);
  }, [isRunStreaming, setRunStreaming]);

  // Publishing to the Artifact pane is syncing with something outside this tree, and it
  // has to happen the moment the ARTIFACT event lands rather than when the run ends.
  const streamedArtifact = state.artifact;
  useEffect(() => {
    setStreamedArtifact(streamedArtifact);
    // Leaving the thread must not leave the Artifact pane pointing at a run that is no
    // longer on screen.
    return () => setStreamedArtifact(null);
  }, [streamedArtifact, setStreamedArtifact]);

  // Handed to ChatComposer; a fresh identity every render would defeat its memoisation.
  // Refetching after the run lives inside useAgentStream (awaited before DONE); the
  // artifact on display rides along as baseArtifactId so the run builds on it.
  const isStreaming = state.isStreaming;
  const handleSend = useCallback(
    async (input: SendInput) => {
      if (isStreaming) {
        return;
      }
      // `messages.length` is constant across a run's tokens (history refetches only at
      // the end), so it does not defeat ChatComposer's memo mid-stream — handleSend's
      // identity changes once per completed turn, outside the token loop.
      setPending({ text: input.question, atLength: messages.length });
      // Before the message, not after: this is the moment the session comes into being
      // (ADR-0005), and the run this message starts should already have the capabilities
      // the user habitually grants.
      await applyRememberedDataSources(detail.dataSourceIds ?? []);
      await send({ baseArtifactId: displayedArtifactId ?? undefined, ...input });
    },
    [
      send,
      displayedArtifactId,
      isStreaming,
      messages.length,
      applyRememberedDataSources,
      detail.dataSourceIds,
    ],
  );

  // The backend body is question-only, so a reask's answers travel as one prose
  // sentence composed from the form (labels stand in for values on the wire).
  const question = state.question;
  const handleAnswer = useCallback(
    async (answers: Answers) => {
      if (!question) {
        return;
      }
      await handleSend({ question: composeAnswerText(question, answers) });
    },
    [handleSend, question],
  );

  // A run that ended cleanly hands over to the refetched history — the bubble it left
  // behind and the one history renders are now the same component, so the swap is
  // invisible. A run that stopped, failed or is waiting on a reask has something the
  // history does not carry, so it stays.
  const runEndedVisibly = state.stopped || state.error !== null || state.question !== null;
  // `AgentStreamState` is structurally a `LiveRun` superset, so the reducer's state
  // passes as-is — the twelve-field hand-copy this used to be meant every new live
  // field touched four files.
  const live: LiveRun | null = state.isStreaming || runEndedVisibly ? state : null;

  // Suppress the optimistic bubble once the refetched history has grown past the point
  // it was sent from — that growth is the refetch carrying the message home (C-3).
  const optimisticUserText =
    pending !== null && showOptimisticBubble(messages.length, pending.atLength)
      ? pending.text
      : null;

  const hasContent = messages.length > 0 || live !== null || optimisticUserText !== null;

  return (
    <>
      {hasContent ? (
        <MessageList
          messages={messages}
          live={live}
          optimisticUserText={optimisticUserText}
          lastRunDurationMs={state.durationMs}
          onAnswer={handleAnswer}
          // The offer is about the artifact this conversation just produced, so it
          // belongs at the tail of the thread and scrolls with it.
          bottomSlot={
            repairOffer ? (
              <RepairOfferCard
                offer={repairOffer}
                onConfirm={() => repair(repairOffer.artifactId, repairOffer.errors)}
                onDismiss={dismissRepair}
              />
            ) : null
          }
        />
      ) : (
        <div className={styles.body}>
          <EmptyState heading={t.studio.emptyStartHeading} subtitle={t.studio.emptyStartSubtitle} />
        </div>
      )}
      <div className={styles.composer}>
        <ChatComposer
          sessionId={sessionId}
          onSend={handleSend}
          disabled={state.isStreaming}
          isStreaming={state.isStreaming}
          onStop={stop}
        />
      </div>
      {/* Visually hidden, never displayed: the announcement channel for a finished
          reply. Its content is set once per run, so the reader hears the whole
          answer exactly once instead of once per token. */}
      <div role="status" aria-label="Latest reply" className={styles.srOnly}>
        {announcement}
      </div>
    </>
  );
};

export default ThreadPanel;
