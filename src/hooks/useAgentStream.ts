import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { isAccessDenied } from '@/api/accessDenied';
import { type SendMessageArgs, streamAgentMessage } from '@/api/agentApi';
import { AgentStreamHttpError } from '@/api/agentStreamError';
import { isCanceled } from '@/api/apiError';
import { INTERRUPTED_TEXTS } from '@/constants/wireStrings';
import { getTranslations } from '@/i18n/useTranslations';
import type { SessionDetail } from '@/types/api';
import type { AgentEvent, QuestionForm, StepItem } from '@/types/api/agentEvent';
import { copyForCode } from '@/utils/describeErrorCode';
import { liftQuestions } from '@/utils/liftQuestions';
import { sessionDetailQueryKey } from './useSessionDetail';
import { sessionsQueryKey } from './useSessions';

/** Everything about a run except which session it belongs to and how it is cancelled. */
export type SendInput = Omit<SendMessageArgs, 'sessionId' | 'signal'>;

export interface AgentStreamState {
  isStreaming: boolean;
  /** True from the moment the user hits stop; cleared when the next run starts. */
  stopped: boolean;
  steps: StepItem[];
  liveText: string;
  answer: string | null;
  artifact: { artifactId: string; title: string } | null;
  question: QuestionForm | null;
  error: { code: string; message: string } | null;
  /** True only for an unexpected disconnection — never for a user-initiated stop
   *  or a refusal the backend reported with a code. */
  networkError: boolean;
  // Live-only: thinking and code belong to this connection, not to the thread
  // history (ADR-0003).
  thinking: string;
  codeText: string;
  /** Wall-clock milliseconds the finished run took; null while idle or streaming. */
  durationMs: number | null;
  /** Epoch ms the current run started; null while idle. Drives the bubble's live timer,
   *  which has to tick from the start rather than only report at the end. */
  startedAt: number | null;
}

type Action =
  | { type: 'START'; startedAt: number }
  | { type: 'RESET' }
  | { type: 'EVENT'; event: AgentEvent }
  | { type: 'STOPPED' }
  | { type: 'FAILED'; error: { code: string; message: string } }
  | { type: 'DISCONNECTED'; durationMs: number }
  | { type: 'DONE'; durationMs: number };

const NETWORK_ERROR_CODE = 'NETWORK_ERROR';

/** How long to keep looking for the backend's record of an interrupted run, and how far
 *  apart. Front-loaded — most of the time it is there almost at once — and capped at a
 *  little over six seconds in total, after which the thread keeps what it has rather than
 *  asking forever. */
const CANCEL_SETTLE_DELAYS_MS = [300, 600, 900, 1400, 1600, 2000] as const;

/** A timeout that gives up when the signal does, so nothing is left pending after the
 *  thread it belonged to is gone. */
const wait = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });
const initialState: AgentStreamState = {
  isStreaming: false,
  stopped: false,
  steps: [],
  liveText: '',
  answer: null,
  artifact: null,
  question: null,
  error: null,
  networkError: false,
  thinking: '',
  codeText: '',
  durationMs: null,
  startedAt: null,
};

/** A step is identified by its `stepKey`: a later event for the same key is a status
 *  transition, not a new step, and must not move it in the list. */
const upsertStep = (steps: StepItem[], incoming: StepItem): StepItem[] => {
  const existingIndex = steps.findIndex((step) => step.stepKey === incoming.stepKey);

  if (existingIndex === -1) {
    return [...steps, incoming];
  }

  return steps.map((step, index) => (index === existingIndex ? incoming : step));
};

const reducer = (state: AgentStreamState, action: Action): AgentStreamState => {
  switch (action.type) {
    case 'START':
      return { ...initialState, isStreaming: true, startedAt: action.startedAt };

    case 'RESET':
      return initialState;

    case 'EVENT': {
      const agentEvent = action.event;

      switch (agentEvent.type) {
        case 'STEP':
          return {
            ...state,
            steps: upsertStep(state.steps, {
              stepKey: agentEvent.stepKey,
              title: agentEvent.title,
              description: agentEvent.description,
              status: agentEvent.status,
            }),
          };

        case 'TOKEN':
          return { ...state, liveText: state.liveText + agentEvent.delta };

        case 'ANSWER':
          return { ...state, answer: agentEvent.text };

        case 'ARTIFACT':
          return {
            ...state,
            artifact: { artifactId: agentEvent.artifactId, title: agentEvent.title },
          };

        case 'QUESTION':
          // The wire truth is the flat list; the rich form only rides along from the
          // mock. Without it, lift the flat list into something renderable.
          return { ...state, question: agentEvent.form ?? liftQuestions(agentEvent.questions) };

        case 'ERROR':
          // Deliberately does NOT end the run: the backend keeps emitting its
          // finalize steps after an ERROR, and the stream closing is what ends
          // it (ADR-0003). Do not "fix" this into an early exit.
          return {
            ...state,
            // Our sentence when the code is one we know; the backend's otherwise. A
            // bubble has room, so an unrecognised code keeps whatever the run said about
            // itself rather than losing it to a generic line.
            error: { code: agentEvent.code, message: copyForCode(agentEvent.code) ?? agentEvent.message },
          };

        case 'THINKING':
          return { ...state, thinking: state.thinking + agentEvent.delta };

        case 'CODE':
          return { ...state, codeText: state.codeText + agentEvent.delta };

        default:
          return state;
      }
    }

    case 'STOPPED':
      return { ...state, stopped: true };

    case 'FAILED':
      return { ...state, isStreaming: false, error: action.error };

    case 'DISCONNECTED':
      return {
        ...state,
        isStreaming: false,
        durationMs: action.durationMs,
        networkError: true,
        // Read here rather than held in a module constant: a constant is evaluated on
        // import, so it would keep whatever language was current then even after the
        // reader switched.
        error: { code: NETWORK_ERROR_CODE, message: getTranslations().chat.networkError },
      };

    case 'DONE':
      return { ...state, isStreaming: false, durationMs: action.durationMs };

    default:
      return state;
  }
};

export const useAgentStream = (
  sessionId: string
): {
  state: AgentStreamState;
  send(input: SendInput): Promise<void>;
  stop(): void;
} => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const queryClient = useQueryClient();
  const controllerRef = useRef<AbortController | null>(null);
  // The settle loop an aborted run starts (below). Aborted on unmount so a thread left
  // clear them — without this they outlived the hook and fired invalidates against
  // the global queryClient up to 1.6s after the thread was gone.
  const settleControllerRef = useRef<AbortController | null>(null);
  // Set by `stop`, read once the run ends. A user stop does not usually surface as a
  // thrown cancel: `streamAgentMessage` cancels its reader when the signal fires, so the
  // in-flight read resolves as *done* and the loop ends the way a finished run does. The
  // difference is invisible from the shape of the ending — only this says which it was.
  const stoppedRef = useRef(false);
  // True only while the async generator is still delivering events. `stop` reads it to
  // tell a real mid-stream interruption from a click that lands in the finishing window
  // (after the last event, while the history refetch runs before DONE) — where the
  // button still says Stop but the run has actually completed.
  const receivingRef = useRef(false);

  // Both messages a run produced live server-side, and the sessions list moves too
  // (last-activity ordering). One invalidate covers both: the detail key is
  // ['sessions', id], which sits under the list's ['sessions'] prefix — invalidating
  // them separately made the detail refetch get cancelled and reissued every time.
  const invalidateSessionData = useCallback(
    () => queryClient.invalidateQueries({ queryKey: sessionsQueryKey }),
    [queryClient]
  );

  // Syncing with an external system (an open HTTP connection) is the one thing
  // useEffect is still for: a run left in flight after unmount holds the socket open
  // and dispatches into a torn-down reducer.
  useEffect(
    () => () => {
      controllerRef.current?.abort();
      settleControllerRef.current?.abort();
    },
    []
  );

  /** Refetches until the backend's record of the interruption is home.
   *
   *  It writes that record asynchronously (`doOnCancel`), so there is no moment the client
   *  can compute — it can only look again. This used to be two fixed refetches 800ms
   *  apart, which is a bet: land late and the thread kept showing a run the history had
   *  already settled, and the only way out was a manual reload.
   *
   *  Bounded, and it stops as soon as the record appears. A backend that never writes one
   *  (or a stop that raced the run finishing normally) must not leave this looping.
   */
  const settleAfterCancel = useCallback(async (): Promise<void> => {
    settleControllerRef.current?.abort();
    const controller = new AbortController();
    settleControllerRef.current = controller;

    for (const delay of CANCEL_SETTLE_DELAYS_MS) {
      await wait(delay, controller.signal);
      if (controller.signal.aborted) {
        return;
      }
      await invalidateSessionData();
      const settled = queryClient.getQueryData<SessionDetail>(sessionDetailQueryKey(sessionId))?.messages.at(-1);
      if (settled !== undefined && INTERRUPTED_TEXTS.includes(settled.text)) {
        return;
      }
    }
  }, [invalidateSessionData, queryClient, sessionId]);

  const send = useCallback(
    async (input: SendInput): Promise<void> => {
      const startedAt = Date.now();
      stoppedRef.current = false;
      dispatch({ type: 'START', startedAt });

      const controller = new AbortController();
      controllerRef.current = controller;
      receivingRef.current = true;

      try {
        for await (const event of streamAgentMessage({
          ...input,
          sessionId,
          signal: controller.signal,
        })) {
          dispatch({ type: 'EVENT', event });
        }
      } catch (error) {
        receivingRef.current = false;
        // A user-initiated stop is not a failure: the run simply ends where it is,
        // and everything already streamed stays on screen. The backend persists an
        // aborted run asynchronously (doOnCancel), so refetch in two delayed stages
        // instead of racing it now.
        if (isCanceled(error)) {
          dispatch({ type: 'DONE', durationMs: Date.now() - startedAt });
          void settleAfterCancel();
          return;
        }

        // The gate is already covering the screen with the backend's own explanation of
        // the refusal. A failure bubble underneath is the same thing said twice, in the
        // vocabulary ADR-0016 exists to keep off the screen, and it sits where nobody can
        // read it. The run simply ends — the same treatment a user-initiated stop gets.
        if (isAccessDenied(error)) {
          dispatch({ type: 'DONE', durationMs: Date.now() - startedAt });
          return;
        }

        if (error instanceof AgentStreamHttpError) {
          dispatch({
            type: 'FAILED',
            error: { code: error.code, message: copyForCode(error.code) ?? error.message },
          });
          return;
        }

        // Anything else is the connection dying under us: not user-initiated, and
        // not something the backend got to report.
        dispatch({ type: 'DISCONNECTED', durationMs: Date.now() - startedAt });
        return;
      }

      receivingRef.current = false;

      // A stopped run ends here rather than in the catch above — cancelling the reader
      // ends the loop cleanly — so this is where most stops actually land. The backend
      // writes its record of the interruption asynchronously, so refetching once, now,
      // asks before there is anything to get.
      if (stoppedRef.current) {
        dispatch({ type: 'DONE', durationMs: Date.now() - startedAt });
        void settleAfterCancel();
        return;
      }

      // Await before DONE: dispatching first would clear the live bubble while the
      // history is still stale, flashing the previous thread state.
      await invalidateSessionData();
      dispatch({ type: 'DONE', durationMs: Date.now() - startedAt });
    },
    [sessionId, invalidateSessionData, settleAfterCancel]
  );

  const stop = useCallback((): void => {
    // Only a stream still being read can be stopped. A click after the last event —
    // in the finishing window, or on an idle hook — would flag `stopped` on a run that
    // completed, leaving a 「已停止」 ghost bubble beside the real reply.
    if (!receivingRef.current) {
      return;
    }
    // Flag it before aborting so the UI shows the stop immediately, rather than
    // waiting for AbortError to propagate out of the async generator.
    stoppedRef.current = true;
    dispatch({ type: 'STOPPED' });
    controllerRef.current?.abort();
  }, []);

  return { state, send, stop };
};
