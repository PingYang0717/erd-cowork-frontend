import React, { type ReactNode, useEffect, useMemo, useRef } from 'react';

import { INTERRUPTED_TEXTS } from '@/constants/wireStrings';
import { useActiveRunStore } from '@/stores/useActiveRunStore';
import type { Message, QuestionForm, StepItem } from '@/types/api';
import { parseAnswerText } from '@/utils/composeAnswerText';
import { liftQuestions } from '@/utils/liftQuestions';
import MessageBubble, { type LiveRun } from './MessageBubble';

export type { LiveRun } from './MessageBubble';
import type { Answers } from './QuestionFormCard';

import styles from './MessageList.module.css';

/** What the current run has produced so far. Null once nothing is streaming. */
/** The wire carries steps as the backend's JSON string; a malformed one renders as no
 *  recap rather than a broken thread. */
const parseSteps = (stepsJson: string | null): StepItem[] => {
  if (!stepsJson) {
    return [];
  }
  try {
    const parsed = JSON.parse(stepsJson) as unknown;
    return Array.isArray(parsed) ? (parsed as StepItem[]) : [];
  } catch {
    return [];
  }
};

/** The reask a past turn asked, lifted into the same form the live one renders. It comes
 *  back read-only: a settled question must not invite a second answer. */
const parseQuestion = (questionsJson: string | null): QuestionForm | null => {
  if (!questionsJson) {
    return null;
  }
  try {
    const parsed = JSON.parse(questionsJson) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null;
    }
    return liftQuestions(parsed);
  } catch {
    return null;
  }
};

interface MessageListProps {
  messages: Message[];
  live: LiveRun | null;
  /** The question just sent, shown as a user bubble before the refetched history
   *  carries it — a run takes seconds and the user's own words must not vanish. */
  optimisticUserText: string | null;
  /** A reask's answer that has been submitted but is not in the refetched history yet.
   *  The trailing card reads it back the same way it reads a settled reply, so the
   *  selection does not vanish for the length of the run that follows it. */
  pendingAnswerText: string | null;
  /** Elapsed time of the run that just finished. Belongs to the turn that produced it,
   *  so it rides the tail AI bubble rather than the bottom of the thread. */
  lastRunDurationMs: number | null;
  onAnswer: (answers: Answers, form: QuestionForm) => void;
  /** Sends the question the interrupted run was answering, again. */
  onRetry: () => void;
  /** Rendered inside the scroll container, after the thread — anything that belongs to
   *  the tail of the conversation rather than above it. */
  bottomSlot?: ReactNode;
}

/** The thread, and the element that scrolls it. It owns the scroll because it owns what
 *  is appended: the log boundary a screen reader announces and the box that follows the
 *  newest turn have to be the same element. */
const MessageList: React.FC<MessageListProps> = ({
  messages,
  live,
  optimisticUserText,
  pendingAnswerText,
  lastRunDurationMs,
  onAnswer,
  onRetry,
  bottomSlot,
}) => {
  // Zustand's setter identity is stable, so passing it down does not defeat
  // MessageBubble's memoisation on every streamed token.
  const pickArtifact = useActiveRunStore((s) => s.pickArtifact);
  // Published by the Artifact pane, so a chip's "shown right →" is decided by what is
  // actually on the right rather than by a guess the two could disagree on.
  const displayedArtifactId = useActiveRunStore((s) => s.displayedArtifactId);

  const containerRef = useRef<HTMLDivElement>(null);
  // Where the reader last was: following the newest turn only holds while they are at
  // the bottom. Scrolling up is how they read an earlier reply (or click its chip), and
  // yanking them back down on every re-render made that impossible. A ref, not state —
  // scroll position must never cause a render.
  const isNearBottomRef = useRef(true);

  // Parsed per settled message and memoised together: a streaming run re-renders this
  // list on every token, and re-parsing the whole history each time is O(history × tokens).
  // The artifact object lives here for the same reason — built inline in the JSX it
  // would be a fresh object every token, and a fresh object prop is all it takes to
  // defeat MessageBubble's memo (probe-measured: bubbles with an artifact re-rendered
  // once per token; text-only bubbles not at all).
  const parsedHistory = useMemo(() => {
    const parsed = messages.map((message, index) => {
      const question = message.sender === 'AI' ? parseQuestion(message.questionsJson) : null;
      // What the reader chose, from the reply they sent. Nothing stores the answers —
      // they went back as one prose sentence, which is the USER message sitting right
      // after the card. Without this a past reask shows every option and no sign of
      // which ones were picked, which reads as a question still waiting to be answered.
      const reply = question !== null ? messages[index + 1] : undefined;
      // The settled reply if the refetch has it, otherwise the answer just submitted —
      // only for the trailing card, which is the only one an answer can be in flight for.
      const replyText =
        reply?.sender === 'USER'
          ? reply.text
          : question !== null && index === messages.length - 1
            ? pendingAnswerText
            : null;
      return {
        steps: message.sender === 'AI' ? parseSteps(message.stepsJson) : [],
        question,
        questionAnswers: question !== null && replyText !== null ? parseAnswerText(question, replyText) : null,
        artifact: message.artifactId
          ? { artifactId: message.artifactId, title: message.artifactTitle ?? message.text }
          : null,
        /** This message is a reask's answer, and the card above it is already showing
         *  what was chosen. Filled in below, once every card knows what it recovered. */
        shownByCardAbove: false,
      };
    });

    // Answering a reask is filling in a form, not saying something. The sentence that
    // goes on the wire (`部件：A14；時間區間：近 7 天`) exists only because the backend has
    // no structured answers channel, and reading it back as a chat message shows the
    // reader plumbing they never wrote. Hidden only where the card above recovered it:
    // if that parse failed, this message is the only record the answer has left.
    for (const [index, entry] of parsed.entries()) {
      if (entry.questionAnswers !== null && parsed[index + 1] !== undefined) {
        parsed[index + 1].shownByCardAbove = true;
      }
    }

    return parsed;
  }, [messages, pendingAnswerText]);

  // Deps are the pieces of content that can change the log's height — not the `live`
  // object itself, whose identity is fresh on every parent render and would force a
  // scrollHeight read (a synchronous reflow) on renders where nothing grew.
  useEffect(() => {
    const container = containerRef.current;
    if (container && isNearBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [
    messages,
    live?.liveText,
    live?.thinking,
    live?.codeText,
    live?.steps,
    live?.question,
    optimisticUserText,
    bottomSlot,
  ]);

  // The reader's own send is the exception: they just spoke, so the reply belongs on
  // screen no matter how far up they had scrolled.
  useEffect(() => {
    const container = containerRef.current;
    if (optimisticUserText !== null && container) {
      container.scrollTop = container.scrollHeight;
      isNearBottomRef.current = true;
    }
  }, [optimisticUserText]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (container) {
      isNearBottomRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    }
  };

  const lastIndex = messages.length - 1;

  return (
    <div
      ref={containerRef}
      role="log"
      // Silenced explicitly: role="log" implies aria-live="polite", and the streaming
      // bubble lives inside it — every token rewrote the paragraph, so a screen reader
      // re-read the ever-longer reply once per token, and a session switch read the
      // whole history back as "additions". The finished reply is announced once,
      // from the dedicated status region in ThreadView (ADR-0014 §live-region).
      aria-live="off"
      aria-label="Messages"
      // The region a reask card's dropdown may not open out of. antd portals its popup to
      // <body> and measures the fit against the viewport, which is far taller than this —
      // so a list that fitted on screen opened over the composer. See `listHeightUnder`.
      data-popup-bounds
      className={styles.thread}
      onScroll={handleScroll}
    >
      {messages.map((message, index) => {
        // A reask on the trailing AI message is the one the run is blocked on: had it
        // been answered, the answer would be a USER message after it (or, before the
        // refetch catches up, the optimistic bubble below). Anything older is a past
        // question — its answers were never stored, so it can only show what was asked
        // and must not invite a second answer to a settled question.
        const isPendingReask =
          index === lastIndex &&
          message.sender === 'AI' &&
          parsedHistory[index].question !== null &&
          // Answered — by the refetched reply or by one still in flight. A settled
          // question must not invite a second answer.
          parsedHistory[index].questionAnswers === null &&
          optimisticUserText === null;
        // The live bubble carries the same reask while the run's state survives, so only
        // one of the two draws it — otherwise the refetch put a second, identical card on
        // screen, and the one the reader reached for first was the dead one.
        const drawnByLiveBubble = isPendingReask && live?.question != null;
        if (parsedHistory[index].shownByCardAbove) {
          return null;
        }
        // The whole turn, not only its card: a reask bubble shows the question and not
        // the working that led to it, and the backend persists that working as this
        // message's text. Rendering the history copy beside the live one put exactly the
        // prose the live bubble withholds back on the screen, one bubble higher.
        if (drawnByLiveBubble) {
          return null;
        }

        return (
          <MessageBubble
            key={message.id}
            sender={message.sender}
            text={message.text}
            createdAt={message.createdAt}
            steps={parsedHistory[index].steps}
            artifact={parsedHistory[index].artifact}
            question={parsedHistory[index].question}
            questionAnswers={parsedHistory[index].questionAnswers}
            artifactShown={message.artifactId !== null && message.artifactId === displayedArtifactId}
            onPickArtifact={pickArtifact}
            questionDisabled={!isPendingReask}
            onAnswer={isPendingReask ? onAnswer : undefined}
            // The turn that just finished is the tail of the history once the live bubble
            // has handed over; nothing older has a duration to show.
            durationMs={live === null && index === lastIndex && message.sender === 'AI' ? lastRunDurationMs : null}
            // Only the trailing interruption is still open; anything above it has already
            // been answered by whatever came after.
            onRetry={index === lastIndex && INTERRUPTED_TEXTS.includes(message.text) ? onRetry : undefined}
          />
        );
      })}
      {optimisticUserText !== null && <MessageBubble sender="USER" text={optimisticUserText} />}
      {live && (
        <MessageBubble
          sender="AI"
          live={live}
          artifactShown={live.artifact !== null && live.artifact.artifactId === displayedArtifactId}
          onPickArtifact={pickArtifact}
          // A reask appears the moment it is asked (the run is blocked on the answer),
          // which is why the handler is wired here and not only after the stream closes.
          onAnswer={onAnswer}
          durationMs={live.isStreaming ? null : lastRunDurationMs}
        />
      )}
      {bottomSlot}
    </div>
  );
};

export default MessageList;
