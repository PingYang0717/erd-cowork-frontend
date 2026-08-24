import { useCallback, useReducer, useRef } from 'react';

import type { AgentEvent, StepItem } from '@/types/api/agentEvent';

import { streamAgentMessage } from '../api/agentApi';

export interface AgentStreamState {
  isStreaming: boolean;
  /** True from the moment the user hits stop; cleared when the next run starts. */
  stopped: boolean;
  steps: StepItem[];
  liveText: string;
}

type Action =
  { type: 'START' } | { type: 'EVENT'; event: AgentEvent } | { type: 'STOPPED' } | { type: 'DONE' };

const initialState: AgentStreamState = {
  isStreaming: false,
  stopped: false,
  steps: [],
  liveText: '',
};

/** A step is identified by its `stepKey`: a later event for the same key is a status
 *  transition, not a new step, and must not move it in the list. */
function upsertStep(steps: StepItem[], incoming: StepItem): StepItem[] {
  const existingIndex = steps.findIndex((step) => step.stepKey === incoming.stepKey);

  if (existingIndex === -1) {
    return [...steps, incoming];
  }

  return steps.map((step, index) => (index === existingIndex ? incoming : step));
}

function reducer(state: AgentStreamState, action: Action): AgentStreamState {
  switch (action.type) {
    case 'START':
      return { ...initialState, isStreaming: true };

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

        default:
          return state;
      }
    }

    case 'STOPPED':
      return { ...state, stopped: true };

    case 'DONE':
      return { ...state, isStreaming: false };

    default:
      return state;
  }
}

export function useAgentStream(sessionId: string): {
  state: AgentStreamState;
  send(text: string): Promise<void>;
  stop(): void;
} {
  const [state, dispatch] = useReducer(reducer, initialState);
  const controllerRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (text: string): Promise<void> => {
      dispatch({ type: 'START' });

      const controller = new AbortController();
      controllerRef.current = controller;

      try {
        for await (const event of streamAgentMessage({
          sessionId,
          text,
          signal: controller.signal,
        })) {
          dispatch({ type: 'EVENT', event });
        }
      } catch (error) {
        // A user-initiated stop is not a failure: the run simply ends where it is,
        // and everything already streamed stays on screen.
        if (!(error instanceof Error && error.name === 'AbortError')) {
          throw error;
        }
      }

      dispatch({ type: 'DONE' });
    },
    [sessionId],
  );

  const stop = useCallback((): void => {
    // Flag it before aborting so the UI shows the stop immediately, rather than
    // waiting for AbortError to propagate out of the async generator.
    dispatch({ type: 'STOPPED' });
    controllerRef.current?.abort();
  }, []);

  return { state, send, stop };
}
