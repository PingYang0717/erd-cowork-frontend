import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { server } from '@/mocks/server';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { mockAgentStream } from '@/test/agentStream';
import { renderStudio, waitForComposer } from '@/test/renderStudio';

const PART_ID_REASK = JSON.stringify([{ text: 'Part ID', options: ['A14', 'A16'], multiSelect: false }]);

const message = (over: { id: string; sender: 'USER' | 'AI'; text?: string; questionsJson?: string | null }) => ({
  text: '',
  stepsJson: null,
  artifactId: null,
  createdAt: new Date(0).toISOString(),
  artifactTitle: null,
  questionsJson: null,
  ...over,
});

/** The backend remembers the reask it asked — `questionsJson` on the AI message. The
 *  mock's own store never sets it, so a suite that needs history to carry one says so. */
const historyOf = (...messages: ReturnType<typeof message>[]) => {
  server.use(
    http.get('/api/sessions/:sessionId', ({ params }) =>
      HttpResponse.json({
        id: params.sessionId,
        title: 'SPC',
        createdAt: new Date(0).toISOString(),
        messages,
        files: [],
        connectors: [],
      })
    )
  );
};

const chipIn = (group: HTMLElement, name: string) => within(group).getByRole('button', { name });

/** A reask the run is still waiting on has to be answerable, wherever it is rendered from.
 *
 *  History reasks are read-only by design: answers are never persisted, so an old card can
 *  only show what was asked, not what was chosen (CONTEXT.md, 分析條件). That reasoning
 *  covers an ANSWERED reask. It used to be applied to every history message, including the
 *  trailing one the agent is blocked on — so once the post-run refetch landed, the question
 *  the user was being asked arrived on screen dead. */
describe('A reask the run is waiting on', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
  });

  it('is answerable when it comes from history, with no live run at all', async () => {
    const user = userEvent.setup();
    historyOf(message({ id: 'm1', sender: 'AI', questionsJson: PART_ID_REASK }));
    renderStudio();

    // An existing session, not a draft: a draft never fetches a detail (ADR-0005).
    await user.click(await screen.findByRole('button', { name: 'Defect pareto — W12' }));
    await waitForComposer();

    const group = await screen.findByRole('group', { name: 'Part ID' });
    await user.click(chipIn(group, 'A14'));

    expect(chipIn(group, 'A14')).toHaveAttribute('aria-pressed', 'true');
  });

  /** The reported symptom. When the run ends on a question the live bubble stays on
   *  screen, and the refetched history now carries the same reask — two identical cards,
   *  the upper one dead. The user reaches for the one they see. */
  it('appears exactly once after the run ends, and that one answers', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'New chat' }));
    await screen.findByRole('button', { name: 'New analysis' });
    await waitForComposer();
    await user.click(screen.getByRole('button', { name: 'SPC analysis' }));

    // From here the backend remembers the reask, the way a real one does.
    historyOf(
      message({ id: 'm1', sender: 'USER', text: 'Run an SPC analysis on Vt (gate CD).' }),
      message({ id: 'm2', sender: 'AI', questionsJson: PART_ID_REASK })
    );

    act(() => stream.push({ type: 'QUESTION', questions: JSON.parse(PART_ID_REASK) }));
    // The run is blocked on the answer, so the backend closes the stream here.
    act(() => stream.close());

    await screen.findByRole('group', { name: 'Part ID' });
    await waitFor(() => expect(screen.getByText('Run an SPC analysis on Vt (gate CD).')).toBeInTheDocument());

    expect(screen.getAllByRole('group', { name: 'Part ID' })).toHaveLength(1);

    const group = screen.getByRole('group', { name: 'Part ID' });
    await user.click(chipIn(group, 'A14'));
    expect(chipIn(group, 'A14')).toHaveAttribute('aria-pressed', 'true');
  }, 20000);

  /** Selecting a chip is not answering. The submit path composes the answer from the
   *  FORM, and the only form ThreadPanel held was the live run's — which a reload does
   *  not have. Pressing Send there did nothing at all. */
  it('actually sends the answer when the reask came from history', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    historyOf(message({ id: 'm1', sender: 'AI', questionsJson: PART_ID_REASK }));
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'Defect pareto — W12' }));
    await waitForComposer();

    const group = await screen.findByRole('group', { name: 'Part ID' });
    await user.click(chipIn(group, 'A14'));
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(stream.requests).toHaveLength(1));
    expect(stream.requests[0]).toMatchObject({ question: 'Part ID：A14' });
  }, 20000);

  /** Submitting must not look like the selection was thrown away.
   *
   *  Two things conspired to empty the card the moment Send was pressed. The answers are
   *  recovered from the reply, and the reply is not in the history until the refetch at
   *  the end of the run — so for the length of that run there was nothing to recover from.
   *  And `QuestionFormCard` held them in `useState`, which reads its argument once on
   *  mount, so even when the refetch landed the card kept the empty object it started
   *  with. It came back only when something remounted it, which in practice meant
   *  reloading the page — the exact shape of the report. */
  it('keeps the selection on screen the moment it is submitted', async () => {
    const user = userEvent.setup();
    mockAgentStream();
    historyOf(message({ id: 'm1', sender: 'AI', questionsJson: PART_ID_REASK }));
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'Defect pareto — W12' }));
    await waitForComposer();

    const group = await screen.findByRole('group', { name: 'Part ID' });
    await user.click(chipIn(group, 'A14'));
    await user.click(screen.getByRole('button', { name: 'Send' }));

    // Still there, and now settled: the run it started is under way and the history has
    // not caught up, but the answer is not in doubt.
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument());
    const settled = screen.getByRole('group', { name: 'Part ID' });
    expect(chipIn(settled, 'A14')).toHaveAttribute('aria-pressed', 'true');
    expect(chipIn(settled, 'A16')).toHaveAttribute('aria-pressed', 'false');
  }, 20000);

  /** The guard against over-fixing: an answered reask must not invite a second answer to
   *  a question that is already behind the reader. */
  it('stays read-only once it has been answered', async () => {
    const user = userEvent.setup();
    historyOf(
      message({ id: 'm1', sender: 'AI', questionsJson: PART_ID_REASK }),
      message({ id: 'm2', sender: 'USER', text: 'Part ID：A14' })
    );
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'Defect pareto — W12' }));
    await waitForComposer();

    const group = await screen.findByRole('group', { name: 'Part ID' });
    // Pressing the option that was NOT chosen changes nothing, and there is no Send to
    // put a second answer behind.
    await user.click(chipIn(group, 'A16'));

    expect(chipIn(group, 'A16')).toHaveAttribute('aria-pressed', 'false');
    expect(within(group).queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
  });

  /** A past reask shows every option and, until now, no sign of which one was picked —
   *  which reads as a question still waiting to be answered. Nothing stores the answers,
   *  but they are not lost: they went back as one prose sentence, and that sentence is
   *  the USER message sitting right after the card. */
  it('shows what was chosen last time', async () => {
    const user = userEvent.setup();
    historyOf(
      message({ id: 'm1', sender: 'AI', questionsJson: PART_ID_REASK }),
      message({ id: 'm2', sender: 'USER', text: 'Part ID：A14' })
    );
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'Defect pareto — W12' }));
    await waitForComposer();

    const group = await screen.findByRole('group', { name: 'Part ID' });
    expect(chipIn(group, 'A14')).toHaveAttribute('aria-pressed', 'true');
    expect(chipIn(group, 'A16')).toHaveAttribute('aria-pressed', 'false');
  });

  /** Answering a reask is filling in a form, not saying something. The sentence that goes
   *  on the wire exists only because the backend has no structured answers channel, and
   *  reading it back as a chat bubble shows the reader plumbing they never wrote — while
   *  the card above already says the same thing, better. */
  it('does not read the composed answer back as a message of its own', async () => {
    const user = userEvent.setup();
    historyOf(
      message({ id: 'm1', sender: 'AI', questionsJson: PART_ID_REASK }),
      message({ id: 'm2', sender: 'USER', text: 'Part ID：A14' })
    );
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'Defect pareto — W12' }));
    await waitForComposer();

    // The card has it, so the bubble does not.
    const group = await screen.findByRole('group', { name: 'Part ID' });
    expect(chipIn(group, 'A14')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Part ID：A14')).not.toBeInTheDocument();
  });

  /** The safety condition. Hiding is only right where the card recovered the answer — if
   *  the parse failed, this message is the only record left of what was chosen, and
   *  hiding it too would lose it entirely. */
  it('keeps the message when the card above could not recover it', async () => {
    const user = userEvent.setup();
    historyOf(
      message({ id: 'm1', sender: 'AI', questionsJson: PART_ID_REASK }),
      message({ id: 'm2', sender: 'USER', text: 'actually, forget that — show me A16 yields' })
    );
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'Defect pareto — W12' }));
    await waitForComposer();

    expect(await screen.findByText('actually, forget that — show me A16 yields')).toBeInTheDocument();
  });

  /** A reader who ignored the reask and typed something else leaves an ordinary message
   *  in exactly the same position. Reading that as answers would put words in their
   *  mouth — and mark options they never picked. */
  it('marks nothing when the message after it was not an answer', async () => {
    const user = userEvent.setup();
    historyOf(
      message({ id: 'm1', sender: 'AI', questionsJson: PART_ID_REASK }),
      message({ id: 'm2', sender: 'USER', text: 'actually, forget that — show me A16 yields' })
    );
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'Defect pareto — W12' }));
    await waitForComposer();

    const group = await screen.findByRole('group', { name: 'Part ID' });
    expect(chipIn(group, 'A14')).toHaveAttribute('aria-pressed', 'false');
    expect(chipIn(group, 'A16')).toHaveAttribute('aria-pressed', 'false');
  });

  /** A run that failed answered nothing. The answer was recorded so the card would not
   *  look emptied the moment Send was pressed — but that record has no expiry of its own,
   *  and the history it was waiting for never arrives when the run dies. The card stayed
   *  settled on an answer that never reached anything, with no way to send it again. */
  it('lets the reask be answered again when the run it started failed', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    historyOf(message({ id: 'm1', sender: 'AI', questionsJson: PART_ID_REASK }));
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'Defect pareto — W12' }));
    await waitForComposer();

    const group = await screen.findByRole('group', { name: 'Part ID' });
    await user.click(chipIn(group, 'A14'));
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(stream.requests).toHaveLength(1));

    act(() => stream.disconnect());

    // Answerable again: the question is still open, so the card has to be. And what was
    // picked is still picked — retrying should not mean choosing everything twice.
    expect(await screen.findByRole('button', { name: 'Send' })).toBeInTheDocument();
    expect(chipIn(screen.getByRole('group', { name: 'Part ID' }), 'A14')).toHaveAttribute('aria-pressed', 'true');
  }, 20000);
});
