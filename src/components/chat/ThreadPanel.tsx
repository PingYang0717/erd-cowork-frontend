import { DatabaseOutlined, ThunderboltFilled } from '@ant-design/icons';
import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import DataBoundary from '@/components/common/DataBoundary';
import ThemeToggle from '@/components/common/ThemeToggle';
import { type SendInput, useAgentStream } from '@/hooks/useAgentStream';
import { useArtifactRepair } from '@/hooks/useArtifactRepair';
import { useSessionDetail } from '@/hooks/useSessionDetail';
import { useActiveRunStore } from '@/stores/useActiveRunStore';
import { useRepairOfferStore } from '@/stores/useRepairOfferStore';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { composeAnswerText } from '@/utils/composeAnswerText';

import ChatComposer from './ChatComposer';
import MessageList from './MessageList';
import { type LiveRun } from './MessageList';
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
      {/* The mockup's data-source chip (its demo is wired to the Inline DB /
          N5 line fixture); sits beside the ThemeToggle because the Workspace
          header itself is out of scope — this app is the eRD Cowork App only. */}
      <span className={styles.dataSourceChip}>
        <DatabaseOutlined aria-hidden />
        Inline DB · N5 line
      </span>
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
            heading="Select or start a session"
            subtitle="Start or select a session from the left to begin an analysis."
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
  const { data: detail } = useSessionDetail(sessionId);
  const messages = detail.messages;
  const { state, send, stop } = useAgentStream(sessionId);
  const setStreamedArtifact = useActiveRunStore((s) => s.setStreamedArtifact);
  const setRunStreaming = useActiveRunStore((s) => s.setRunStreaming);
  const displayedArtifactId = useActiveRunStore((s) => s.displayedArtifactId);
  // The user's words go on screen the moment they send; cleared once the refetched
  // history carries them (streaming flips false after the hook's await-then-DONE).
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const prevStreamingRef = useRef(false);
  useEffect(() => {
    if (prevStreamingRef.current && !state.isStreaming) {
      setPendingQuestion(null);
    }
    prevStreamingRef.current = state.isStreaming;
  }, [state.isStreaming]);
  const repairOffer = useRepairOfferStore((store) => store.offer);
  const dismissRepair = useRepairOfferStore((store) => store.dismiss);
  const clearRepair = useRepairOfferStore((store) => store.clear);
  const repair = useArtifactRepair();

  // An offer belongs to one artifact in one session. Moving away from that session
  // leaves it pointing at something the user is no longer looking at.
  useEffect(() => clearRepair, [sessionId, clearRepair]);

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
      setPendingQuestion(input.question);
      await send({ baseArtifactId: displayedArtifactId ?? undefined, ...input });
    },
    [send, displayedArtifactId, isStreaming],
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
  const live: LiveRun | null =
    state.isStreaming || runEndedVisibly
      ? {
          isStreaming: state.isStreaming,
          steps: state.steps,
          liveText: state.liveText,
          stopped: state.stopped,
          networkError: state.networkError,
          thinking: state.thinking,
          question: state.question,
          codeText: state.codeText,
          tables: state.tables,
          error: state.error,
          artifact: state.artifact,
          startedAt: state.startedAt,
        }
      : null;

  // Suppress the optimistic bubble once the refetched history already ends with it.
  const lastMessage = messages[messages.length - 1];
  const lastHistoryQuestion = lastMessage?.sender === 'USER' ? lastMessage.text : null;
  const optimisticUserText =
    pendingQuestion !== null && pendingQuestion !== lastHistoryQuestion ? pendingQuestion : null;

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
          <EmptyState
            heading="Start an analysis"
            subtitle={'Try "Daily monitor (A14)" below, or ask for an SPC analysis on Vt.'}
          />
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
    </>
  );
};

export default ThreadPanel;
