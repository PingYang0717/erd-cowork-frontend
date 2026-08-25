import { DatabaseOutlined, ThunderboltFilled } from '@ant-design/icons';
import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ThemeToggle } from '@/components/common/ThemeToggle';
import { type SendInput, useAgentStream } from '@/hooks/useAgentStream';
import { useArtifactRepair } from '@/hooks/useArtifactRepair';
import { useSessionDetail } from '@/hooks/useSessionDetail';
import { useActiveRunStore } from '@/stores/useActiveRunStore';
import { usePendingPromptStore } from '@/stores/usePendingPromptStore';
import { useRepairOfferStore } from '@/stores/useRepairOfferStore';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { composeAnswerText } from '@/utils/composeAnswerText';

import { ChatComposer } from './ChatComposer';
import { MessageList } from './MessageList';
import type { Answers } from './QuestionFormCard';
import { RepairOfferCard } from './RepairOfferCard';
import styles from './ThreadPanel.module.css';

function ThreadHeader() {
  return (
    <header className={styles.header} aria-label="Thread header">
      <span className={styles.headerTitle}>
        <ThunderboltFilled aria-hidden className={styles.headerIcon} />
        Cowork · Data studio
      </span>
      {/* The mockup's data-source chip (its demo is wired to the Inline DB /
          N5 line fixture); sits beside the ThemeToggle per the scope-trim of
          the Workspace header (ADR-0003). */}
      <span className={styles.dataSourceChip}>
        <DatabaseOutlined aria-hidden />
        Inline DB · N5 line
      </span>
      <ThemeToggle />
    </header>
  );
}

function EmptyState({ heading, subtitle }: { heading: string; subtitle: ReactNode }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyStateIcon}>
        <ThunderboltFilled aria-hidden />
      </div>
      <p className={styles.emptyStateHeading}>{heading}</p>
      <p className={styles.emptyStateSubtitle}>{subtitle}</p>
    </div>
  );
}

const ThreadPanel: React.FC = () => {
  const selectedSessionId = useSessionSelectionStore((s) => s.selectedSessionId);

  if (!selectedSessionId) {
    return (
      <div className={styles.panel}>
        <ThreadHeader />
        <div className={styles.body}>
          <EmptyState
            heading="Select or start a session"
            subtitle="Start or select a session from the left to begin an analysis."
          />
        </div>
      </div>
    );
  }

  return <ThreadView sessionId={selectedSessionId} />;
};

function ThreadView({ sessionId }: { sessionId: string }) {
  const { data: detail } = useSessionDetail(sessionId);
  const messages = detail.messages;
  const { state, send, stop } = useAgentStream(sessionId);
  const setStreamedArtifact = useActiveRunStore((s) => s.setStreamedArtifact);
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
  const bodyRef = useRef<HTMLDivElement>(null);

  // Publishing to the Artifact pane is syncing with something outside this tree, and it
  // has to happen the moment the ARTIFACT event lands rather than when the run ends.
  const streamedArtifact = state.artifact;
  useEffect(() => {
    setStreamedArtifact(streamedArtifact);
    // Leaving the thread must not leave the Artifact pane pointing at a run that is no
    // longer on screen.
    return () => setStreamedArtifact(null);
  }, [streamedArtifact, setStreamedArtifact]);

  // The mockup scrolls the thread to the bottom shortly after a new message
  // renders (40ms, letting layout settle), so long conversations never leave
  // the latest reply out of view.
  useEffect(() => {
    const timer = setTimeout(() => {
      const body = bodyRef.current;
      if (body) {
        body.scrollTop = body.scrollHeight;
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [messages.length, state.steps.length, state.liveText]);

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

  // Prompts pushed from other panels (the Artifact panel's regenerate button) enter
  // the same send pipeline: the thread registers its sender with the store, so the
  // panel's click is a plain event-handler call into it.
  const registerPromptSender = usePendingPromptStore((s) => s.register);
  const unregisterPromptSender = usePendingPromptStore((s) => s.unregister);
  useEffect(() => {
    const sender = (prompt: { question: string; baseArtifactId?: string }) => {
      void handleSend(prompt);
    };
    registerPromptSender(sender);
    return () => unregisterPromptSender(sender);
  }, [handleSend, registerPromptSender, unregisterPromptSender]);

  const runEndedVisibly = state.stopped || state.error !== null || state.question !== null;
  const live =
    state.isStreaming || runEndedVisibly
      ? {
          isStreaming: state.isStreaming,
          steps: state.steps,
          liveText: state.liveText,
          stopped: state.stopped,
          thinking: state.thinking,
          question: state.question,
          codeText: state.codeText,
          tables: state.tables,
          error: state.error,
        }
      : null;

  // Suppress the optimistic bubble once the refetched history already ends with it.
  const lastMessage = messages[messages.length - 1];
  const lastHistoryQuestion = lastMessage?.sender === 'USER' ? lastMessage.text : null;
  const optimisticUserText =
    pendingQuestion !== null && pendingQuestion !== lastHistoryQuestion ? pendingQuestion : null;

  const hasContent = messages.length > 0 || live !== null || optimisticUserText !== null;

  return (
    <div className={styles.panel}>
      <ThreadHeader />
      <div ref={bodyRef} role="log" aria-label="Messages" className={styles.body}>
        {hasContent ? (
          <MessageList
            messages={messages}
            live={live}
            optimisticUserText={optimisticUserText}
            lastRunDurationMs={state.durationMs}
            onAnswer={handleAnswer}
          />
        ) : (
          <EmptyState
            heading="Start an analysis"
            subtitle={'Try "Daily monitor (A14)" below, or ask for an SPC analysis on Vt.'}
          />
        )}
        {repairOffer && (
          <RepairOfferCard
            offer={repairOffer}
            onConfirm={() => repair(repairOffer.artifactId, repairOffer.errors)}
            onDismiss={dismissRepair}
          />
        )}
      </div>
      <div className={styles.composer}>
        <ChatComposer
          sessionId={sessionId}
          onSend={handleSend}
          disabled={state.isStreaming}
          isStreaming={state.isStreaming}
          onStop={stop}
        />
      </div>
    </div>
  );
}

export { ThreadPanel };
export default ThreadPanel;
