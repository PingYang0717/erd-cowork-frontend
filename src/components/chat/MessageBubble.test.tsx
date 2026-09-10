import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { INTERRUPTED_TEXTS, REPAIR_RECORD_PREFIXES } from '@/constants/wireStrings';
import { server } from '@/mocks/server';
import type { StepItem } from '@/types/api';
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
  question: null,
  error: null,
  artifact: null,
  startedAt: null,
  ...overrides,
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

  /** `[[table:…]]` used to place a TABLE event's result in the answer. TABLE has left
   *  the contract, so nothing resolves a marker any more — and an unresolved one must be
   *  removed rather than printed, because it is display plumbing the reader never sees. */
  it('never shows a raw table marker in the answer', async () => {
    render(<MessageBubble sender="AI" live={liveRun({ liveText: 'Before [[table:t1]] after' })} />);

    expect(await screen.findByText(/Before after/)).toBeInTheDocument();
    expect(screen.queryByText(/\[\[table:/)).not.toBeInTheDocument();
  });

  /** The prose an agent writes before asking is usually what explains why it has to ask.
   *  Withholding it and showing the card alone is a question out of nowhere — the reader
   *  is asked to choose without being told what the choice is about. */
  it('keeps the sentence that led up to a reask, beside the card', async () => {
    render(
      <MessageBubble
        sender="AI"
        live={liveRun({
          steps: [step()],
          liveText: 'The scan matched 6 lots, which is a lot to chart.',
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
    expect(await screen.findByText(/The scan matched 6 lots/)).toBeInTheDocument();
  });

  /** `[[table:…]]` is display plumbing the reader must never see. That was guaranteed for
   *  the answer, where the markers are resolved away — but the thinking panel prints its
   *  text verbatim, so a marker mentioned there reached the screen raw. */
  it('never shows a raw table marker in the thinking panel', async () => {
    const user = userEvent.setup();
    render(
      <MessageBubble
        sender="AI"
        live={liveRun({ isStreaming: true, thinking: 'Building [[table:t1]] from the scan' })}
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

  /** A dropped connection is something the reader has to act on, so the bubble says it.
   *  A user-initiated stop is not: they know, they did it — and the record the backend
   *  writes is what states it, in the one wording that survives a reload. */
  it('reports a dropped connection in the bubble, and leaves a stop to the record', () => {
    const { rerender } = render(<MessageBubble sender="AI" live={liveRun({ liveText: 'Partial', stopped: true })} />);
    expect(screen.getByText('eRD AI')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(<MessageBubble sender="AI" live={liveRun({ liveText: 'Partial', networkError: true })} />);
    expect(screen.getByText('⚠ Connection lost — please send again')).toBeInTheDocument();
  });

  /** The trailing interruption is the only one still open, and the record already tells
   *  the reader to send again — this makes that a button. */
  it('offers a retry on an interrupted record when one is given', async () => {
    const onRetry = vi.fn();
    render(<MessageBubble sender="AI" text={INTERRUPTED_TEXTS[0]} onRetry={onRetry} />);

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows no retry on an interruption further up the thread', () => {
    render(<MessageBubble sender="AI" text={INTERRUPTED_TEXTS[0]} />);
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
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

/** Claude's hover affordances: a message says when it was sent, and offers to copy
 *  itself. Both are always in the DOM and revealed by CSS on hover or focus — a control
 *  that only exists while the pointer is over it is a control a keyboard cannot reach. */
describe('message time and copy', () => {
  let writeText: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Assigned onto the existing object: `navigator.clipboard` is a getter-only property,
    // so replacing the whole thing throws.
    writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  });

  it('says when a message was sent', () => {
    render(<MessageBubble sender="USER" text="幫我看 A14 的 SPC" createdAt="2026-09-10T02:00:00.000Z" />);

    // Relative wording, like the session rail and the version menu; the machine-readable
    // moment on `datetime`, and the exact one on `title` for a reader who wants it.
    //
    // Asserted on `datetime` rather than on either of those: the rendered wording is
    // relative to now, and `title` is `toLocaleString()`, whose narrow no-break space
    // Testing Library normalises out of the attribute but not out of the query.
    const time = document.querySelector('time');
    expect(time).toHaveAttribute('datetime', '2026-09-10T02:00:00.000Z');
    expect(time?.getAttribute('title')).toContain('2026');
  });

  it('copies what the bubble says', async () => {
    const user = userEvent.setup();
    render(<MessageBubble sender="USER" text="幫我看 A14 的 SPC" createdAt="2026-09-10T02:00:00.000Z" />);

    await user.click(screen.getByRole('button', { name: 'Copy message' }));
    expect(writeText).toHaveBeenCalledWith('幫我看 A14 的 SPC');
  });

  /** The only confirmation a copy gets. Inside the success path, not beside it: it used
   *  to be possible for a refused clipboard to still say "copied" — see the share
   *  dialog, where the same mistake was made and fixed. */
  it('says so once it is copied, and not when the clipboard refused', async () => {
    const user = userEvent.setup();
    render(<MessageBubble sender="AI" text="掃描比對到 6 個 Lot。" createdAt="2026-09-10T02:00:00.000Z" />);

    await user.click(screen.getByRole('button', { name: 'Copy message' }));
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();

    writeText.mockRejectedValueOnce(new Error('denied'));
    render(<MessageBubble sender="AI" text="另一則" createdAt="2026-09-10T02:00:00.000Z" />);
    const [, second] = screen.getAllByRole('button', { name: /^Cop/ });
    await user.click(second);
    expect(second).toHaveAccessibleName('Copy message');
  });

  /** A reply that produced only an Artifact has no prose to copy, and a button that
   *  copies an empty string is a button that lies about having done something. */
  it('offers no copy when there is nothing to copy', () => {
    render(<MessageBubble sender="AI" text="" createdAt="2026-09-10T02:00:00.000Z" />);
    // The time still shows — it is the copy offer alone that has nothing to stand on.
    expect(document.querySelector('time')).toHaveAttribute('datetime', '2026-09-10T02:00:00.000Z');
    expect(screen.queryByRole('button', { name: /^Cop/ })).toBeNull();
  });
});
