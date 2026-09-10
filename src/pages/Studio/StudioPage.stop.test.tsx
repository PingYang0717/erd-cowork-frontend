import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { INTERRUPTED_TEXTS } from '@/constants/wireStrings';
import { server } from '@/mocks/server';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { mockAgentStream } from '@/test/agentStream';
import { renderStudio, waitForComposer } from '@/test/renderStudio';

const QUESTION = 'Run an SPC analysis on Vt (gate CD).';

const selectASession = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: 'New chat' }));
  await screen.findByRole('button', { name: 'New analysis' });
  await waitForComposer();
};

const thread = () => screen.getByRole('log', { name: 'Messages' });

/** One history row in the wire's shape, with the quiet defaults filled in. */
const message = (over: { id: string; sender: 'USER' | 'AI'; text: string }) => ({
  stepsJson: null,
  artifactId: null,
  artifactTitle: null,
  questionsJson: null,
  createdAt: '2026-09-10T00:01:00.000Z',
  ...over,
});

/** What the real backend leaves behind after the SSE client goes away mid-run: the
 *  question, and its own record of the interruption. The half-written reply is NOT
 *  persisted — see docs/api/backend-feedback.md. */
const historyAfterInterruption = (sessionId: string) => {
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
          message({ id: 'm1', sender: 'AI', text: INTERRUPTED_TEXTS[0] }),
        ],
      })
    )
  );
};

const interruptedRecord = () => within(thread()).queryAllByText(new RegExp(INTERRUPTED_TEXTS[0]));

/** Stopping is not failing, and it is not the frontend's story to tell: the backend keeps
 *  its own record of an interrupted run, and what the reader is looking at has to be what
 *  the history holds — or the screen says one thing now and another after a reload. */
describe('Stopping a run', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
  });

  /** A run stopped before it said anything has nothing to show. The bubble it used to
   *  leave behind was a label and a stop notice with a blank between them — a shell that
   *  reads as a reply that failed to render. */
  it('leaves no bubble behind when the run produced nothing', async () => {
    const user = userEvent.setup();
    mockAgentStream();
    renderStudio();

    await selectASession(user);
    await user.click(screen.getByRole('button', { name: 'SPC analysis' }));

    // What the refetch will find. The backend writes it on disconnect (doOnCancel); here
    // it is staged before the stop so the two delayed refetches are guaranteed to see it.
    historyAfterInterruption(useSessionSelectionStore.getState().selectedSessionId as string);
    await user.click(await screen.findByRole('button', { name: 'Stop' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument());
    // No empty reply bubble. The record that lands below IS an AI bubble, so the claim
    // has to be about content: nothing the agent "said" is blank.
    for (const bubble of document.querySelectorAll('[class*="aiBubble"]')) {
      expect(bubble.textContent).not.toBe('');
    }
    // What the reader typed is still theirs, and still on screen.
    expect(within(thread()).getByText(QUESTION)).toBeInTheDocument();

    // The interruption is stated by the backend's own record, once it lands.
    await waitFor(() => expect(interruptedRecord()).toHaveLength(1), { timeout: 4000 });
  });

  /** The thread converges on what the history actually holds. The half-written reply is
   *  not part of that — the backend does not persist it — so it goes when the record
   *  arrives, and what the reader sees is what a reload would show. */
  it('settles on the history the backend kept, not on what was on screen', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudio();

    await selectASession(user);
    await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
    act(() => stream.push({ type: 'TOKEN', delta: 'Recomputed control limits.' }));
    await screen.findByText('Recomputed control limits.');

    historyAfterInterruption(useSessionSelectionStore.getState().selectedSessionId as string);
    await user.click(await screen.findByRole('button', { name: 'Stop' }));

    // The refetch brings the record home and the thread becomes the history — which the
    // backend did not persist the half-written reply into. That loss is the point: the
    // screen and the history agree, so a reload changes nothing.
    await waitFor(() => expect(interruptedRecord()).toHaveLength(1), { timeout: 4000 });
    expect(within(thread()).queryByText('Recomputed control limits.')).not.toBeInTheDocument();
  });

  /** The record already tells the reader to send again. This makes that a click — and it
   *  APPENDS a turn, which is all the backend allows: there is no messages endpoint, so
   *  the run that stopped cannot be replaced. */
  it('offers to send the same question again, from the record itself', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudio();

    await selectASession(user);
    await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
    act(() => stream.push({ type: 'TOKEN', delta: 'Recomputed' }));
    await screen.findByText('Recomputed');

    historyAfterInterruption(useSessionSelectionStore.getState().selectedSessionId as string);
    await user.click(await screen.findByRole('button', { name: 'Stop' }));

    const retry = await screen.findByRole('button', { name: 'Retry' }, { timeout: 4000 });
    await user.click(retry);

    await waitFor(() => expect(stream.requests).toHaveLength(2));
    expect(stream.requests[1]).toMatchObject({ question: QUESTION });
  });
});
