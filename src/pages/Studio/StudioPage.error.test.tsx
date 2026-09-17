import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { server } from '@/mocks/server';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { mockAgentStream } from '@/test/agentStream';
import { renderStudio, waitForComposer } from '@/test/renderStudio';

const QUESTION = 'Run an SPC analysis on Vt (gate CD).';

/** What the backend says about this run — and, in this shape of failure, also what it
 *  writes into the history as the agent's reply. The two being the same sentence is the
 *  whole point: an ERROR whose message is the reply is the case that used to print it
 *  twice, once black from the history and once red from the run. */
const REFUSAL = 'The gate CD dataset has no measurements in that window, so there is nothing to chart.';

const selectASession = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: 'New chat' }));
  await screen.findByRole('button', { name: 'New analysis' });
  await waitForComposer();
};

const thread = () => screen.getByRole('log', { name: 'Messages' });

const message = (over: { id: string; sender: 'USER' | 'AI'; text: string; stepsJson?: string | null }) => ({
  stepsJson: null,
  artifactId: null,
  artifactTitle: null,
  questionsJson: null,
  createdAt: '2026-09-10T00:01:00.000Z',
  ...over,
});

/** The history a backend leaves when it both reports the failure on the wire and keeps
 *  the agent's account of it as a message — the ordinary case for a run that failed
 *  having already said why. The failing step rides along, which is what keeps the red
 *  mark on the row after a reload. */
const historyWithTheReply = (sessionId: string) => {
  server.use(
    http.get(`/api/sessions/${sessionId}`, () =>
      HttpResponse.json({
        id: sessionId,
        title: 'New analysis',
        createdAt: '2026-09-10T00:00:00.000Z',
        files: [],
        connectors: [],
        messages: [
          message({ id: 'u1', sender: 'USER', text: QUESTION }),
          message({
            id: 'm1',
            sender: 'AI',
            text: REFUSAL,
            stepsJson: JSON.stringify([{ stepKey: 'query', title: 'Query', description: null, status: 'ERROR' }]),
          }),
        ],
      })
    )
  );
};

/** A run can fail with nothing to show for it: the backend reports the code and keeps no
 *  message. The history then holds the question and nothing else. */
const historyWithoutAReply = (sessionId: string) => {
  server.use(
    http.get(`/api/sessions/${sessionId}`, () =>
      HttpResponse.json({
        id: sessionId,
        title: 'New analysis',
        createdAt: '2026-09-10T00:00:00.000Z',
        files: [],
        connectors: [],
        messages: [message({ id: 'u1', sender: 'USER', text: QUESTION })],
      })
    )
  );
};

const sessionId = () => useSessionSelectionStore.getState().selectedSessionId as string;

/** A failed run converges on the history, the same way a stopped one does. The failure
 *  belongs to the row the backend kept — the agent's own words, and the steps recap's red
 *  mark beside them — not to a second bubble that says it again and is gone after a
 *  reload. */
describe('A run that fails', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
  });

  it('hands over to the history instead of repeating the failure in red beside it', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudio();

    await selectASession(user);
    await user.click(screen.getByRole('button', { name: 'SPC analysis' }));

    historyWithTheReply(sessionId());
    // The wire's message IS the reply here, and the code is one this app has no sentence
    // for — so nothing softens it: what the backend said lands on screen verbatim.
    act(() => stream.push({ type: 'ERROR', code: 'QUERY_EMPTY', message: REFUSAL }));
    await within(thread()).findByText(REFUSAL);

    // The ERROR does not end the run (ADR-0003); the stream closing does.
    act(() => stream.close());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument());

    // Once: the history's row. Not the history's row plus the run's.
    await waitFor(() => expect(within(thread()).getAllByText(REFUSAL)).toHaveLength(1));
    // And the row that remains is the settled one — it carries the recap the live bubble
    // had no steps for.
    expect(within(thread()).getByRole('button', { name: /Worked through/ })).toBeInTheDocument();
  });

  it('keeps the failure on screen when the backend recorded no reply to hand over to', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudio();

    await selectASession(user);
    await user.click(screen.getByRole('button', { name: 'SPC analysis' }));

    historyWithoutAReply(sessionId());
    act(() => stream.push({ type: 'ERROR', code: 'QUERY_EMPTY', message: REFUSAL }));
    act(() => stream.close());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument());

    // Nothing in the history says what happened, so the run's own account stays: it is
    // the only one the reader gets.
    await waitFor(() => expect(within(thread()).getByRole('alert')).toHaveTextContent(REFUSAL));
    expect(within(thread()).getByText(QUESTION)).toBeInTheDocument();
  });
});
