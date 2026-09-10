import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  AppstoreOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  LoadingOutlined,
  ReloadOutlined,
  ThunderboltFilled,
  ToolOutlined,
} from '@ant-design/icons';

import Tooltip from '@/components/common/Tooltip';
import { INTERRUPTED_TEXTS, REPAIR_RECORD_PREFIXES } from '@/constants/wireStrings';
import type { AgentStreamState } from '@/hooks/useAgentStream';
import type { QuestionForm, StepItem } from '@/types/api';
import { formatDuration } from '@/utils/formatDuration';
import { formatRelativeTime } from '@/utils/formatRelativeTime';
import { stripTableMarkers } from '@/utils/tableMarkers';
import CollapsiblePanel from './CollapsiblePanel';
import { LiveElapsed } from './Elapsed';
import HtmlCodePanel from './HtmlCodePanel';
import QuestionFormCard, { type Answers } from './QuestionFormCard';
import { StepRow, StepsRecap } from './StepList';

import styles from './MessageBubble.module.css';

/** The slice of a run's state this bubble renders. A `Pick` rather than its own shape:
 *  the reducer's state is the single source of truth for what a run carries, so a new
 *  live field is added exactly once (per-field docs live on `AgentStreamState`). */
export type LiveRun = Pick<
  AgentStreamState,
  | 'isStreaming'
  | 'stopped'
  | 'networkError'
  | 'steps'
  | 'liveText'
  | 'thinking'
  | 'codeText'
  | 'question'
  | 'error'
  | 'artifact'
  | 'startedAt'
>;
import { useTranslations } from '@/i18n/useTranslations';
import ReplyText from './ReplyText';

/** What a message says about itself: when it was sent, and an offer to copy it.
 *
 *  Always rendered, revealed by CSS on hover or focus. Mounting it on hover instead would
 *  nudge every message below it on every pass of the pointer, and — worse — would put the
 *  copy button out of a keyboard's reach entirely, since a keyboard never hovers. Invisible
 *  but focusable is the trap that pattern usually falls into; `:focus-within` is what
 *  keeps it out of it (ADR-0014).
 *
 *  The relative wording matches the session rail and the version menu. The exact moment is
 *  on the `title`, where someone who needs it can find it and nobody else has to read it. */
const MessageMeta: React.FC<{
  createdAt?: string | null;
  copyText: string;
  /** How long the turn took, for a run that has finished. */
  durationMs?: number | null;
  /** Offered on the turn that stopped: sends the same question again. */
  onRetry?: () => void;
  /** The newest turn keeps its row on show; older ones reveal on hover. Claude's rule,
   *  and the reason is the same: the reply you have just been given is the one you act
   *  on, and hiding its controls behind a pointer makes them findable only by accident. */
  always?: boolean;
}> = ({ createdAt, copyText, durationMs, onRetry, always = false }) => {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!createdAt && copyText === '' && durationMs == null && onRetry === undefined) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      // Inside the try. The tick is the only confirmation a copy gets, and saying it
      // whether or not anything reached the clipboard is the mistake the share dialog
      // already made once.
      setCopied(true);
    } catch {
      // Nothing to add: the text is on screen and still selectable by hand.
    }
  };

  return (
    <div className={styles.meta} data-latest={always || undefined}>
      {/* How long the turn took, then what to do about it, then when it was sent. The two
          times bracket the controls: they are context, and context reads at the edges. */}
      {durationMs != null && (
        <span className={`${styles.metaAside} ${styles.metaTimer}`}>
          <ClockCircleOutlined aria-hidden className={styles.metaAsideIcon} />
          {formatDuration(durationMs)}
        </span>
      )}

      {/* Icons alone. A row of labelled buttons under every reply competes with the reply;
          the label lives in the tooltip, where it is one hover away and nowhere else. */}
      <span className={always ? `${styles.metaActions} ${styles.metaActionsAlways}` : styles.metaActions}>
        {/* Nothing to copy — a reply that produced only an Artifact — offers no button:
            one that copies an empty string claims to have done something it did not. */}
        {copyText !== '' && (
          <Tooltip content={copied ? t.common.copied : t.common.copy}>
            <button
              type="button"
              className={styles.metaButton}
              aria-label={copied ? 'Copied' : 'Copy message'}
              onClick={handleCopy}
            >
              {copied ? <CheckOutlined aria-hidden /> : <CopyOutlined aria-hidden />}
            </button>
          </Tooltip>
        )}
        {/* It APPENDS a turn — the backend has no messages endpoint, so the run that
            stopped cannot be replaced (docs/api/backend-feedback.md). */}
        {onRetry && (
          <Tooltip content={t.chat.retryRun}>
            <button type="button" className={styles.metaButton} aria-label="Retry" onClick={onRetry}>
              <ReloadOutlined aria-hidden />
            </button>
          </Tooltip>
        )}
      </span>

      {createdAt && (
        <time
          dateTime={createdAt}
          title={new Date(createdAt).toLocaleString()}
          className={`${styles.metaAside} ${styles.metaTime}`}
        >
          {formatRelativeTime(createdAt)}
        </time>
      )}
    </div>
  );
};

export interface MessageBubbleProps {
  sender: 'USER' | 'AI';
  /** A settled message's text. The live bubble's text comes from `live.liveText`. */
  text?: string;
  /** Attachments sent with this message. Ours hang off the message, not the session. */
  steps?: StepItem[] | null;
  artifact?: { artifactId: string; title: string } | null;
  question?: QuestionForm | null;
  /** History reasks render read-only: a settled question must not invite a second
   *  answer. What was chosen still shows — see `questionAnswers`. */
  questionDisabled?: boolean;
  /** What was answered, for a past reask. Reconstructed from the reply the reader sent,
   *  which is the only record of it there is. */
  questionAnswers?: Answers | null;
  /** Takes the form as well as the answers: the answer is composed FROM the form, and
   *  the only form the thread held was the live run's — which a reload does not have. */
  onAnswer?: (answers: Answers, form: QuestionForm) => void;
  /** True when this reply's artifact is the one the Artifact pane is showing; the
   *  chip then states the fact instead of offering the hand-off. */
  artifactShown?: boolean;
  /** Puts this reply's artifact on the Artifact pane. Without it the chip is a plain
   *  label (full-page artifact view has no pane to hand to). */
  onPickArtifact?: (artifactId: string) => void;
  /** Offered on an interrupted record: sends the same question again. Only the trailing
   *  one gets it — an interruption further up is settled history, and the run that
   *  followed it has already been asked. */
  onRetry?: () => void;
  /** The newest turn in the thread: its actions stay on show rather than waiting for a
   *  pointer. */
  isLatest?: boolean;
  /** When the message was sent. Absent on the live bubble — a run still being written has
   *  no settled moment, and the backend supplies one when the history catches up. */
  createdAt?: string | null;
  /** How long the turn behind this bubble took; shown once it is over. */
  durationMs?: number | null;
  /** The open (or visibly-ended) run this bubble fronts. One object instead of the
   *  nine per-field props it used to be: the fields only ever travel together — the
   *  reducer's own state IS this shape (`LiveRun` is a `Pick` of it) — and hand-copying
   *  them across ThreadPanel → MessageList → here meant a new live field touched four
   *  files. History bubbles simply omit it, so their memoised props stay flat and
   *  stable. When set, `liveText` / `steps` / `artifact` / `question` win over the
   *  flat props. */
  live?: LiveRun | null;
}

// Steps used to be revealed by a client-side timer, so a step could only ever be
// pending, running or done. The backend now reports the status itself, which means a
// step can also fail — hence the fourth state (ADR-0003).
/** Messages the backend persists on its own behalf — an interrupted response, a repair
 *  outcome. They are records, not agent prose, so they never reach the Markdown renderer. */
const systemRecordKind = (text: string): 'interrupted' | 'repair' | null => {
  if (INTERRUPTED_TEXTS.includes(text)) {
    return 'interrupted';
  }
  return REPAIR_RECORD_PREFIXES.some((prefix) => text.startsWith(prefix)) ? 'repair' : null;
};

/** One turn in the thread. History and the run in flight go through exactly this
 *  component: a turn that has just finished must look identical to the same turn read
 *  back tomorrow, or the hand-off from live to history flickers. */
const MessageBubble: React.FC<MessageBubbleProps> = ({
  sender,
  text: settledText,
  steps: settledSteps,
  artifact: settledArtifact,
  question: settledQuestion,
  questionDisabled = false,
  questionAnswers,
  onAnswer,
  artifactShown = false,
  onPickArtifact,
  onRetry,
  isLatest = false,
  createdAt,
  durationMs,
  live,
}) => {
  const t = useTranslations();

  // One source per field: a live run's own state, else the settled message's.
  const text = live ? live.liveText : (settledText ?? '');
  const steps = live ? live.steps : settledSteps;
  const artifact = live ? live.artifact : settledArtifact;
  const question = live ? live.question : settledQuestion;
  const streaming = live?.isStreaming ?? false;
  const stopped = live?.stopped ?? false;
  const networkError = live?.networkError ?? false;
  const thinking = live?.thinking || null;
  const codeText = live?.codeText || null;
  const error = live?.error ?? null;
  const timerStartedAt = live?.isStreaming ? live.startedAt : null;

  // Streaming appends 10-40 tokens a second, and each one re-renders this bubble with a
  // longer `text`. The expensive part is below: splitting and markdown-parsing the FULL
  // accumulated text — n tokens cost O(n²) total. So the parse follows a *deferred* copy:
  // React keeps the cheap parts (label, timer, steps) on every token and re-parses only
  // when the main thread has room, skipping intermediate values under load. Zero timers,
  // so the test doctrine (src/test/README.md: the test decides when events arrive, every
  // state observable) is untouched — act() flushes deferred renders synchronously.
  const deferredText = useDeferredValue(text);

  const recordKind = systemRecordKind(text);
  // Kept when a reask follows it, not hidden: the prose an agent writes before asking is
  // usually what explains why it has to ask ("the scan matched 6 lots, which is a lot to
  // chart"). A card on its own, with that sentence withheld, is a question out of nowhere.
  //
  // Stripped, not resolved: `[[table:…]]` used to place a TABLE event's result in the
  // answer, and with TABLE gone from the contract there is nothing to resolve it against.
  // A marker that still arrives must not reach the reader as literal text.
  const answerText = useMemo(() => (recordKind ? '' : stripTableMarkers(deferredText)), [recordKind, deferredText]);

  if (sender === 'USER') {
    return (
      <div className={styles.userRow}>
        <div className={styles.userBubble}>
          <span className={styles.userText}>{text}</span>
        </div>
        <MessageMeta createdAt={createdAt} copyText={text} always={isLatest} />
      </div>
    );
  }

  const hasSteps = steps != null && steps.length > 0;
  // A turn is still in play while the stream is open, while it waits on an unanswered
  // reask, and after a stop — its steps stay unfolded, because "Worked through N steps"
  // is a claim about a turn that finished. A disabled reask is a past one, so a history
  // bubble carrying it is settled.
  const turnInPlay = streaming || stopped || (question != null && !questionDisabled);

  return (
    <div className={styles.aiRow}>
      <div className={styles.aiLabel}>
        <ThunderboltFilled aria-hidden className={styles.aiLabelIcon} />
        {t.chat.agentName}
      </div>
      <div className={styles.aiBubble}>
        {/* The live region exists for as long as the run does, not only once it has
            something to say: a run that has started but reported nothing yet is still
            what a screen reader needs announced. */}
        {/* aria-atomic="false" overrides role="status"'s implicit atomic=true: each
            arriving step row is announced on its own, instead of the whole panel
            being re-read every time a step is appended (ADR-0014 §step-announcements). */}
        {streaming && (
          <div role="status" aria-atomic="false" aria-label="eRD AI is working" className={styles.workingSteps}>
            {/* The run says it is running from inside the step panel, where the steps it
                is producing appear — rather than from the label above, which names who is
                speaking and should read the same whether or not they are mid-sentence. */}
            <div className={styles.workingHeader}>
              <LoadingOutlined aria-hidden spin className={styles.workingHeaderIcon} />
              {t.chat.agentThinking}
            </div>
            {(steps ?? []).map((step) => (
              <StepRow key={step.stepKey} step={step} />
            ))}
          </div>
        )}
        {!streaming && turnInPlay && hasSteps && (
          <div className={styles.workingSteps}>
            {steps.map((step) => (
              <StepRow key={step.stepKey} step={step} />
            ))}
          </div>
        )}
        {!turnInPlay && hasSteps && <StepsRecap steps={steps} />}

        {/* The agent's reasoning as it arrives. Collapsed by default and never
            persisted: it belongs to this connection, not to the conversation
            (ADR-0003). */}
        {thinking && (
          <CollapsiblePanel label={t.chat.thinking}>
            <p className={styles.thinkingBody}>{stripTableMarkers(thinking)}</p>
          </CollapsiblePanel>
        )}
        {codeText && <HtmlCodePanel code={codeText} autoScroll={streaming} />}

        {recordKind === 'interrupted' && (
          <p data-record="true" className={styles.record}>
            {text}
          </p>
        )}
        {recordKind === 'repair' && (
          <p data-record="true" className={styles.record}>
            <ToolOutlined aria-hidden className={styles.recordIcon} />
            {text}
          </p>
        )}

        {answerText !== '' && <ReplyText text={answerText} />}

        {artifact &&
          (onPickArtifact ? (
            /* Clickable, like cowork's: the pane can only be steered from its own
               version menu otherwise, so an earlier reply's chip would claim "shown
               right" about something that is not on the right at all (ADR-0002). */
            <button
              type="button"
              className={`${styles.artifactChip} ${styles.artifactChipButton} ${
                artifactShown ? styles.artifactChipShown : ''
              }`}
              aria-label={
                artifactShown
                  ? `${artifact.title} — shown in the Artifact panel`
                  : `Show ${artifact.title} in the Artifact panel`
              }
              aria-current={artifactShown ? 'true' : undefined}
              onClick={() => onPickArtifact(artifact.artifactId)}
            >
              <AppstoreOutlined aria-hidden className={styles.artifactChipIcon} />
              <span className={styles.artifactChipTitle}>{artifact.title}</span>
              <span className={styles.artifactChipHint}>{artifactShown ? t.chat.shownRight : t.chat.showRight}</span>
            </button>
          ) : (
            <div className={styles.artifactChip}>
              <AppstoreOutlined aria-hidden className={styles.artifactChipIcon} />
              <span className={styles.artifactChipTitle}>{artifact.title}</span>
              <span className={styles.artifactChipHint}>{t.chat.shownRight}</span>
            </div>
          ))}
        {/* The source is only fetchable once the run has stopped writing it; while it is
            still arriving, the live panel above is the same content. */}
        {artifact && !codeText && <HtmlCodePanel artifactId={artifact.artifactId} />}

        {question && (
          <QuestionFormCard
            form={question}
            disabled={questionDisabled}
            answered={questionAnswers ?? undefined}
            onSubmit={(answers) => onAnswer?.(answers, question)}
          />
        )}

        {/* Keyed on the start: a new turn gets a fresh timer rather than inheriting the
            last one's reading for up to a second. */}
        {streaming && timerStartedAt != null && <LiveElapsed key={timerStartedAt} startedAt={timerStartedAt} />}

        {/* Still an alert: the run ended in a way the user has to act on, and the
            dedicated wording is what distinguishes it from a backend refusal. */}
        {networkError && (
          <p role="alert" className={styles.networkNote}>
            {t.chat.networkError}
          </p>
        )}
        {error && !networkError && (
          <p role="alert" className={styles.runError}>
            {error.message}
          </p>
        )}
      </div>
      {/* Outside the bubble, under it — the same place the user's own sits. Inside, its
          reserved height showed as a strip of empty grey on every settled reply.

          Not while the run is open: the text is still being written, and a copy taken
          mid-sentence is half a reply. A record (an interruption, a repair) copies its own
          wording — that IS its prose. */}
      {!streaming && (
        <MessageMeta
          createdAt={createdAt}
          copyText={recordKind ? text : answerText}
          durationMs={durationMs}
          onRetry={onRetry}
          always={isLatest}
        />
      )}
    </div>
  );
};

/** The open turn's timer. The clock is read in the interval rather than during render —
 *  a render has to be able to run twice and say the same thing. */
// Memoised: a streaming run re-renders the whole list on every token, while a settled
// message above it never changes.
const MemoisedMessageBubble = React.memo(MessageBubble);

export default MemoisedMessageBubble;
