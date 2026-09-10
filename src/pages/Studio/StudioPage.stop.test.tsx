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

/** Stopping is not failing. What the run produced stays; what it did not produce is not
 *  drawn as an empty shell; and the fact that it stopped is stated once. */
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
    await user.click(await screen.findByRole('button', { name: 'Stop' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument());
    // No half-drawn reply — but the interruption IS stated, the same way it will be
    // stated after a reload.
    expect(within(thread()).getByText(new RegExp(INTERRUPTED_TEXTS[0]))).toBeInTheDocument();
    expect(within(thread()).queryByRole('button', { name: 'View HTML' })).toBeNull();
    // What the reader typed is still theirs, and still on screen.
    expect(within(thread()).getByText('Run an SPC analysis on Vt (gate CD).')).toBeInTheDocument();
  });

  it('keeps what the run had already written', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudio();

    await selectASession(user);
    await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
    act(() => stream.push({ type: 'TOKEN', delta: 'Recomputed control limits.' }));
    await screen.findByText('Recomputed control limits.');

    await user.click(await screen.findByRole('button', { name: 'Stop' }));

    expect(within(thread()).getByText('Recomputed control limits.')).toBeInTheDocument();
    expect(within(thread()).getByText(new RegExp(INTERRUPTED_TEXTS[0]))).toBeInTheDocument();
  });

  /** The backend persists its own record of the interruption, so once the refetch lands
   *  two things say the run stopped. The bubble is the one on screen, so it speaks; the
   *  record is what remains after a reload, so it speaks then. Never both at once. */
  /** The record is drawn the instant the run stops, and the refetch that brings the real
   *  one home replaces it with something identical — so what a reader sees now is what
   *  they will still see after a reload. It used to be announced one way now (a stop
   *  notice on the bubble) and another way later (the record), which read as two
   *  different outcomes. And it is only ever said once. */
  it('states the interruption immediately, once, in the wording that survives a reload', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudio();

    await selectASession(user);
    const sessionId = useSessionSelectionStore.getState().selectedSessionId as string;

    await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
    act(() => stream.push({ type: 'TOKEN', delta: 'Recomputed control limits.' }));
    await screen.findByText('Recomputed control limits.');

    // What the real backend leaves behind: the question, and its own record that the SSE
    // client went away mid-run. The partial text is NOT persisted — see
    // docs/api/backend-feedback.md.
    server.use(
      http.get(`/api/sessions/${sessionId}`, () =>
        HttpResponse.json({
          id: sessionId,
          title: 'New analysis',
          createdAt: '2026-09-10T00:00:00.000Z',
          files: [],
          connectors: [],
          messages: [
            message({ id: 'u1', sender: 'USER', text: 'Run an SPC analysis on Vt (gate CD).' }),
            message({ id: 'm1', sender: 'AI', text: INTERRUPTED_TEXTS[0] }),
          ],
        })
      )
    );

    await user.click(await screen.findByRole('button', { name: 'Stop' }));

    // Immediately, without waiting for anything to come back.
    expect(within(thread()).getAllByText(new RegExp(INTERRUPTED_TEXTS[0]))).toHaveLength(1);

    // And still once after the two delayed refetches an aborted run schedules.
    await waitFor(() => expect(within(thread()).getAllByText(/Run an SPC analysis/)).not.toHaveLength(0), {
      timeout: 4000,
    });
    expect(within(thread()).getAllByText(new RegExp(INTERRUPTED_TEXTS[0]))).toHaveLength(1);
  });

  /** The record already tells the reader to send again. This makes that a click — and
   *  says plainly that it appends a new turn rather than replacing the one that stopped,
   *  which is all the backend allows (there is no messages endpoint to edit or truncate). */
  it('offers to send the same question again', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudio();

    await selectASession(user);
    await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
    act(() => stream.push({ type: 'TOKEN', delta: 'Recomputed' }));
    await screen.findByText('Recomputed');
    await user.click(await screen.findByRole('button', { name: 'Stop' }));

    await user.click(await screen.findByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(stream.requests).toHaveLength(2));
    expect(stream.requests[1]).toMatchObject({ question: 'Run an SPC analysis on Vt (gate CD).' });
  });
});
