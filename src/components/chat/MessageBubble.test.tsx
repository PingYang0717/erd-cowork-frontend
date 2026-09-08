import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { INTERRUPTED_TEXTS, REPAIR_RECORD_PREFIXES } from '@/constants/wireStrings';
import { server } from '@/mocks/server';
import type { StepItem, TableResult } from '@/types/api';
import MessageBubble, { type LiveRun } from './MessageBubble';

const step = (overrides: Partial<StepItem> = {}): StepItem => ({
  stepKey: 'scan',
  title: 'Scanning lots',
  description: null,
  status: 'SUCCESS',
  ...overrides,
});

/** A run in the shape the reducer would hand over, with quiet defaults. */
const liveRun = (overrides: Partial<LiveRun> = {}): LiveRun => ({
  isStreaming: false,
  stopped: false,
  networkError: false,
  steps: [],
  liveText: '',
  thinking: '',
  codeText: '',
  tables: [],
  replyTableIds: [],
  question: null,
  error: null,
  artifact: null,
  startedAt: null,
  ...overrides,
});

const table = (tableId = 't1'): TableResult => ({
  tableId,
  intent: 'Top offending lots',
  columns: ['lot', 'cpk'],
  rows: [['L1', 0.9]],
  truncated: false,
});

describe('MessageBubble', () => {
  it('renders what the user said, right-aligned and without an agent label', () => {
    render(<MessageBubble sender="USER" text="Run SPC on Vt" />);

    expect(screen.getByText('Run SPC on Vt')).toBeInTheDocument();
    expect(screen.queryByText(/eRD AI/)).not.toBeInTheDocument();
  });

  it('labels an agent reply and renders it as Markdown', async () => {
    render(<MessageBubble sender="AI" text={'Found **two** outliers.'} />);

    expect(screen.getByText('eRD AI')).toBeInTheDocument();
    // findBy: the markdown renderer is a lazy chunk (ReplyText shows the raw source as
    // plain text for the instant it loads), so the STRONG arrives one tick later.
    expect((await screen.findByText('two')).tagName).toBe('STRONG');
  });

  it('places a table where its marker sits in the answer', () => {
    render(<MessageBubble sender="AI" live={liveRun({ liveText: 'Before [[table:t1]] after', tables: [table()] })} />);

    expect(screen.getByRole('table', { name: 'Top offending lots' })).toBeInTheDocument();
    expect(screen.queryByText(/\[\[table:/)).not.toBeInTheDocument();
  });

  it("still shows a table the answer did not place, when it is the answer's own", () => {
    render(
      <MessageBubble
        sender="AI"
        live={liveRun({ liveText: 'No markers here.', tables: [table()], replyTableIds: ['t1'] })}
      />
    );

    expect(screen.getByRole('table', { name: 'Top offending lots' })).toBeInTheDocument();
  });

  /** A TABLE the agent emits while it is still reasoning is a query it ran to work
   *  something out — the same kind of thing as the THINKING text beside it. It is not
   *  held back until the reply starts; it is not the reader's to see at all. The reducer
   *  is what tells the two apart, by whether the first token had arrived (`replyTableIds`). */
  it('never shows a table the agent produced while it was still thinking', () => {
    const { rerender } = render(
      <MessageBubble
        sender="AI"
        live={liveRun({ isStreaming: true, thinking: 'Scanning the lot table…', tables: [table()] })}
      />
    );

    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    // The reply arrives, and then the run ends. Neither makes a working query into a
    // result: it stays out both times.
    rerender(
      <MessageBubble
        sender="AI"
        live={liveRun({
          isStreaming: true,
          thinking: 'Scanning…',
          liveText: 'Here is what I found',
          tables: [table()],
        })}
      />
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    rerender(
      <MessageBubble sender="AI" live={liveRun({ isStreaming: false, thinking: 'Done.', tables: [table()] })} />
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  /** The marker overrides the arrival time. An answer that names a table by id is
   *  claiming it as part of what it is saying, whenever the table happened to arrive. */
  it('places a thinking-time table anyway when the answer claims it by marker', () => {
    render(<MessageBubble sender="AI" live={liveRun({ liveText: 'As shown: [[table:t1]]', tables: [table()] })} />);

    expect(screen.getByRole('table', { name: 'Top offending lots' })).toBeInTheDocument();
  });

  /** A reask is a question, not an answer. The prose and the query results the run
   *  gathered on the way to asking are its working — putting them beside the card asks
   *  the reader to take in a half-finished analysis before answering the one thing that
   *  would finish it. The steps stay: they say what it did before it had to ask. */
  it('shows only the reask, not the working that led to it', () => {
    render(
      <MessageBubble
        sender="AI"
        live={liveRun({
          steps: [step()],
          liveText: 'The scan matched 6 lots, which is a lot to chart.',
          tables: [table()],
          replyTableIds: ['t1'],
          question: {
            formKey: 'lot-scope',
            title: 'Which lots?',
            fields: [
              { key: 'lot', label: 'Lot', kind: 'single', required: true, options: [{ value: 'A14', label: 'A14' }] },
            ],
            submitLabel: 'Submit',
            disabledHint: 'Answered',
            summaryLabel: 'Lots',
          },
        })}
      />
    );

    expect(screen.getByRole('group', { name: 'Lot' })).toBeInTheDocument();
    expect(screen.getByText('Scanning lots')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText(/The scan matched 6 lots/)).not.toBeInTheDocument();
  });

  /** `[[table:…]]` is display plumbing the reader must never see. That was guaranteed for
   *  the answer, where the markers are resolved away — but the thinking panel prints its
   *  text verbatim, so a marker mentioned there reached the screen raw. */
  it('never shows a raw table marker in the thinking panel', async () => {
    const user = userEvent.setup();
    render(
      <MessageBubble
        sender="AI"
        live={liveRun({ isStreaming: true, thinking: 'Building [[table:t1]] from the scan', tables: [table()] })}
      />
    );

    await user.click(screen.getByRole('button', { name: /Thinking/i }));

    expect(screen.queryByText(/\[\[table:/)).not.toBeInTheDocument();
    expect(screen.getByText(/Building.*from the scan/)).toBeInTheDocument();
  });

  it('shows the steps as they run, and collapses them into a recap once finished', async () => {
    const { rerender } = render(
      <MessageBubble sender="AI" live={liveRun({ isStreaming: true, steps: [step({ status: 'RUNNING' })] })} />
    );

    expect(screen.getByText('Scanning lots')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Worked through/ })).not.toBeInTheDocument();

    rerender(<MessageBubble sender="AI" text="Done." steps={[step()]} />);

    const recap = screen.getByRole('button', { name: 'Worked through 1 step' });
    expect(screen.queryByText('Scanning lots')).not.toBeInTheDocument();
    await userEvent.click(recap);
    expect(screen.getByText('Scanning lots')).toBeInTheDocument();
  });

  it('ticks the turn timer while streaming and freezes it once the turn is done', () => {
    vi.useFakeTimers();
    try {
      const startedAt = Date.now();
      const { rerender } = render(<MessageBubble sender="AI" live={liveRun({ isStreaming: true, startedAt })} />);

      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(screen.getByText('3s')).toBeInTheDocument();

      rerender(<MessageBubble sender="AI" text="Done." durationMs={4200} />);
      expect(screen.getByText('4.2s')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('distinguishes a user-initiated stop from a dropped connection', () => {
    const { rerender } = render(<MessageBubble sender="AI" live={liveRun({ liveText: 'Partial', stopped: true })} />);
    expect(screen.getByText('⏹ Generation stopped')).toBeInTheDocument();

    rerender(<MessageBubble sender="AI" live={liveRun({ liveText: 'Partial', networkError: true })} />);
    expect(screen.queryByText('⏹ Generation stopped')).not.toBeInTheDocument();
    expect(screen.getByText('⚠ Connection lost — please send again')).toBeInTheDocument();
  });

  it('renders the backend’s own record messages as hints, not as agent prose', () => {
    render(<MessageBubble sender="AI" text={INTERRUPTED_TEXTS[0]} />);
    expect(screen.getByText(INTERRUPTED_TEXTS[0])).toHaveAttribute('data-record', 'true');
  });

  it('renders a repair record as a hint too', () => {
    const text = `${REPAIR_RECORD_PREFIXES[0]}（2 個）`;
    render(<MessageBubble sender="AI" text={text} />);
    expect(screen.getByText(text)).toHaveAttribute('data-record', 'true');
  });

  it('offers the artifact it produced, and a way to read its HTML', () => {
    render(
      <MessageBubble sender="AI" text="Here it is." artifact={{ artifactId: 'artifact-1', title: 'SPC dashboard' }} />
    );

    expect(screen.getByText('SPC dashboard')).toBeInTheDocument();
    // cowork's read-back label; the "</>" glyph prefix is decorative (ADR-0002).
    expect(screen.getByRole('button', { name: 'View HTML' })).toBeInTheDocument();
  });

  it('shows the live HTML instead of the fetchable one while the agent is still writing it', () => {
    render(
      <MessageBubble
        sender="AI"
        live={liveRun({
          isStreaming: true,
          codeText: '<html>',
          artifact: { artifactId: 'artifact-1', title: 'SPC dashboard' },
        })}
      />
    );

    expect(screen.getAllByRole('button', { name: /HTML/ })).toHaveLength(1);
  });

  /** Only a 404 means "there is no source". A 500 or a dropped connection says nothing
   *  about whether it exists — the same rule the Artifact panes follow for their
   *  documents — so the two failures get different sentences. */
  it('says the source is absent only when the backend answered 404', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/artifacts/:id/raw', () => new HttpResponse(null, { status: 404 })));
    render(<MessageBubble sender="AI" text="Done." artifact={{ artifactId: 'artifact-1', title: 'SPC dashboard' }} />);

    await user.click(screen.getByRole('button', { name: 'View HTML' }));

    expect(await screen.findByText('No source available for this version')).toBeInTheDocument();
  });

  it('reports a failed source load as a failure, not as an absence', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/artifacts/:id/raw', () => new HttpResponse(null, { status: 500 })));
    render(<MessageBubble sender="AI" text="Done." artifact={{ artifactId: 'artifact-1', title: 'SPC dashboard' }} />);

    await user.click(screen.getByRole('button', { name: 'View HTML' }));

    expect(await screen.findByText('Could not load the source — please try again shortly')).toBeInTheDocument();
  });
});
