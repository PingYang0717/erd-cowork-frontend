import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { INTERRUPTED_TEXTS, REPAIR_RECORD_PREFIXES } from '@/constants/wireStrings';
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
    render(
      <MessageBubble
        sender="AI"
        live={liveRun({ liveText: 'Before [[table:t1]] after', tables: [table()] })}
      />,
    );

    expect(screen.getByRole('table', { name: 'Top offending lots' })).toBeInTheDocument();
    expect(screen.queryByText(/\[\[table:/)).not.toBeInTheDocument();
  });

  it('still shows a table that no marker placed', () => {
    render(
      <MessageBubble
        sender="AI"
        live={liveRun({ liveText: 'No markers here.', tables: [table()] })}
      />,
    );

    expect(screen.getByRole('table', { name: 'Top offending lots' })).toBeInTheDocument();
  });

  it('shows the steps as they run, and collapses them into a recap once finished', async () => {
    const { rerender } = render(
      <MessageBubble
        sender="AI"
        live={liveRun({ isStreaming: true, steps: [step({ status: 'RUNNING' })] })}
      />,
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
      const { rerender } = render(
        <MessageBubble sender="AI" live={liveRun({ isStreaming: true, startedAt })} />,
      );

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
    const { rerender } = render(
      <MessageBubble sender="AI" live={liveRun({ liveText: 'Partial', stopped: true })} />,
    );
    expect(screen.getByText('⏹ Generation stopped')).toBeInTheDocument();

    rerender(
      <MessageBubble sender="AI" live={liveRun({ liveText: 'Partial', networkError: true })} />,
    );
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
      <MessageBubble
        sender="AI"
        text="Here it is."
        artifact={{ artifactId: 'artifact-1', title: 'SPC dashboard' }}
      />,
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
      />,
    );

    expect(screen.getAllByRole('button', { name: /HTML/ })).toHaveLength(1);
  });
});
