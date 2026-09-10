import React, { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { ThunderboltFilled } from '@ant-design/icons';

import DataBoundary from '@/components/common/DataBoundary';
import { type SendInput, useAgentStream } from '@/hooks/useAgentStream';
import { useArtifactRepair } from '@/hooks/useArtifactRepair';
import { useSessionDetail } from '@/hooks/useSessionDetail';
import { useTranslations } from '@/i18n/useTranslations';
import { useActiveRunStore } from '@/stores/useActiveRunStore';
import { useRepairOfferStore } from '@/stores/useRepairOfferStore';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import type { QuestionForm } from '@/types/api';
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
          <EmptyState heading={t.studio.emptyNoSessionHeading} subtitle={t.studio.emptyNoSessionSubtitle} />
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
  const repair = useArtifactRepair();
  const { data: detail } = useSessionDetail(sessionId);
  const messages = detail.messages;
  const { state, send, stop } = useAgentStream(sessionId);

  const repairOffer = useRepairOfferStore((store) => store.offer);
  const resetRepair = useRepairOfferStore((store) => store.reset);
  const dismissRepair = useRepairOfferStore((store) => store.dismiss);

  const setRunStreaming = useActiveRunStore((s) => s.setRunStreaming);
  const setStreamedArtifact = useActiveRunStore((s) => s.setStreamedArtifact);
  const displayedArtifactId = useActiveRunStore((s) => s.displayedArtifactId);

  /** What the screen reader hears when a run finishes: the complete reply, once. The
   *  thread itself is aria-live="off" (every token used to be re-read; ADR-0014 §live-region), so this
   *  sr-only region is the one place a finished answer is announced from. */
  const [announcement, setAnnouncement] = useState('');

  // The user's words go on screen the moment they send; cleared once the refetched
  // history carries them (streaming flips false after the hook's await-then-DONE).
  // The optimistically-shown message plus the history length at the moment it was sent:
  // the bubble is suppressed once the refetched history has grown past `atLength` — i.e.
  // now carries it. Comparing lengths, not text, is what makes sending the same words
  // twice in a row show two bubbles (an equal last-history text would falsely suppress).
  //
  // No setPending(null) on run end — deliberately. The success path never needed it:
  // the bubble is suppressed by derivation the moment the refetched history grows past
  // `atLength` (showOptimisticBubble), and the awaited refetch lands before DONE. And
  // the failure path must NOT have it: the history has nothing to carry, so clearing
  // made the user's own words vanish with only the error left. The pending text
  // lingers in state, suppressed or visible as the derivation decides, until the next
  // send replaces it or the session remount retires it.
  const [pending, setPending] = useState<{ text: string; atLength: number; isAnswer: boolean } | null>(null);

  const prevStreamingRef = useRef(false);

  useEffect(() => {
    if (prevStreamingRef.current && !state.isStreaming) {
      setAnnouncement(state.liveText || state.answer || '');
    }
    prevStreamingRef.current = state.isStreaming;
    // liveText/answer are stable once streaming has ended; the transition guard makes
    // the extra runs their presence in deps causes no-ops.
  }, [state.isStreaming, state.liveText, state.answer]);

  // Publishing to the Artifact pane is syncing with something outside this tree, and it
  // has to happen the moment the ARTIFACT event lands rather than when the run ends.
  const streamedArtifact = state.artifact;

  useEffect(() => {
    setStreamedArtifact(streamedArtifact);
    // Leaving the thread must not leave the Artifact pane pointing at a run that is no
    // longer on screen.
    return () => setStreamedArtifact(null);
  }, [streamedArtifact, setStreamedArtifact]);

  // The Artifact pane refuses a Reload while a run is open; like the artifact itself
  // this is state another tree needs, so it goes through the store.
  const isRunStreaming = state.isStreaming;

  useEffect(() => {
    setRunStreaming(isRunStreaming);
    return () => setRunStreaming(false);
  }, [isRunStreaming, setRunStreaming]);

  // An offer belongs to one artifact in one session. Moving away from that session
  // leaves it pointing at something the user is no longer looking at.
  useEffect(() => resetRepair, [sessionId, resetRepair]);

  // Handed to ChatComposer; a fresh identity every render would defeat its memoisation.
  // Refetching after the run lives inside useAgentStream (awaited before DONE); the
  // artifact on display rides along as baseArtifactId so the run builds on it.
  const isStreaming = state.isStreaming;

  /** `optimistic` is whether the text is the reader's own words. It is for what they
   *  typed; a reask's answer is a sentence this app composed from a form, and the card
   *  above already shows what was chosen — far better than the sentence does. */
  const submit = useCallback(
    async (input: SendInput, optimistic: boolean) => {
      if (isStreaming) {
        return;
      }
      // Recorded either way. `optimistic` decides whether it is *shown* as a bubble; a
      // reask's answer is not, but it still has to count as answered until the refetch
      // carries it home — otherwise the card it came from sits there empty and open, and
      // the selection the reader just submitted looks like it was thrown away.
      //
      // `messages.length` is constant across a run's tokens (history refetches only at
      // the end), so it does not defeat ChatComposer's memo mid-stream — the identity
      // changes once per completed turn, outside the token loop.
      setPending({ text: input.question, atLength: messages.length, isAnswer: !optimistic });
      await send({ baseArtifactId: displayedArtifactId ?? undefined, ...input });
    },
    [send, displayedArtifactId, isStreaming, messages.length]
  );

  const handleSend = useCallback((input: SendInput) => submit(input, true), [submit]);

  // The question the stopped run was answering. From the optimistic record when the
  // refetch has not carried it home yet, else from the history's last USER message —
  // between those two, one of them always has it.
  const lastQuestion =
    pending?.text ?? [...messages].reverse().find((message) => message.sender === 'USER')?.text ?? '';

  // The backend body is question-only, so a reask's answers travel as one prose
  // sentence composed from the form (labels stand in for values on the wire).
  // Composed from the form the card was drawn with, not from `state.question`: a reask
  // waiting when the tab was reloaded has no live state behind it, and this used to
  // return early there — the chips responded and Send did nothing at all.
  const handleAnswer = useCallback(
    async (answers: Answers, form: QuestionForm) => {
      await submit({ question: composeAnswerText(form, answers) }, false);
    },
    [submit]
  );

  // What this run put on screen. A stop before the first token leaves all of it empty,
  // and a bubble drawn from nothing is a label and a stop notice with a blank between
  // them — which reads as a reply that failed to render rather than as a run that never
  // got going.
  const runProducedSomething = Boolean(
    state.liveText || state.answer || state.steps.length || state.artifact || state.thinking || state.codeText
  );

  // A run that ended cleanly hands over to the refetched history — the bubble it left
  // behind and the one history renders are now the same component, so the swap is
  // invisible. A run that failed or is waiting on a reask has something the history does
  // not carry, so it stays; a run that stopped stays only if it has something to hold.
  const runEndedVisibly = (state.stopped && runProducedSomething) || state.error !== null || state.question !== null;
  // `AgentStreamState` is structurally a `LiveRun` superset, so the reducer's state
  // passes as-is — the twelve-field hand-copy this used to be meant every new live
  // field touched four files.
  const live: LiveRun | null = state.isStreaming || runEndedVisibly ? state : null;

  // Suppress the optimistic bubble once the refetched history has grown past the point
  // it was sent from — that growth is the refetch carrying the message home (ADR-0015 §optimistic-bubble).
  const stillAhead = pending !== null && showOptimisticBubble(messages.length, pending.atLength);
  const optimisticUserText = stillAhead && !pending.isAnswer ? pending.text : null;
  /** A reask's answer that the refetched history has not caught up with yet. The card it
   *  was submitted from reads it back the same way it reads the settled reply.
   *
   *  Dropped when the run it started failed. This record exists to bridge one gap — from
   *  Send until the refetch carries the answer home — and a run that died never reaches
   *  the other side of it: the history it was waiting for is not coming. Left standing, it
   *  settled the card on an answer that reached nothing, and the question stayed unopened
   *  with no way to send it again.
   *
   *  The optimistic bubble beside it deliberately survives a failure, and for the opposite
   *  reason: those are the reader's own words, and a failure that erased them would leave
   *  an error card explaining a message nobody can see. An answer is not words — it is a
   *  claim that a question is settled, and a failed run settles nothing. */
  const pendingAnswerText = stillAhead && pending.isAnswer && state.error === null ? pending.text : null;

  const hasContent = messages.length > 0 || live !== null || optimisticUserText !== null;

  return (
    <>
      {hasContent ? (
        <MessageList
          messages={messages}
          live={live}
          optimisticUserText={optimisticUserText}
          pendingAnswerText={pendingAnswerText}
          lastRunDurationMs={state.durationMs}
          onAnswer={handleAnswer}
          // The offer is about the artifact this conversation just produced, so it
          // belongs at the tail of the thread and scrolls with it.
          // Draw the record ourselves exactly when history is not showing one at the
          // tail — either because the refetch has not carried it home yet, or because
          // the live bubble is on screen and MessageList suppresses it there (rendered
          // from history it would sit ABOVE the half-written reply it interrupted).
          stoppedRecordPending={state.stopped && (live !== null || stillAhead)}
          onRetry={() => void submit({ question: lastQuestion }, true)}
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
        {/* Its own boundary: the composer suspends on the connectors catalogue and
            /config — peripheral reads whose failure used to take the WHOLE thread
            pane down, history included. Failed here, the conversation stays readable
            and the card's Retry (real now, per DataBoundary) covers just this strip. */}
        <DataBoundary label="Composer">
          <ChatComposer
            sessionId={sessionId}
            onSend={handleSend}
            disabled={state.isStreaming}
            isStreaming={state.isStreaming}
            onStop={stop}
          />
        </DataBoundary>
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
