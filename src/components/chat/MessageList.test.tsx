import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useActiveRunStore } from '@/stores/useActiveRunStore';
import type { Message } from '@/types/api/index';

import MessageList from './MessageList';
import { type LiveRun } from './MessageList';

const message = (id: string, sender: 'USER' | 'AI', text: string): Message => ({
  id,
  sender,
  text,
  stepsJson: null,
  artifactId: null,
  createdAt: '2026-08-27T00:00:00Z',
  artifactTitle: null,
  questionsJson: null,
});

const liveRun = (overrides: Partial<LiveRun> = {}): LiveRun => ({
  isStreaming: true,
  steps: [],
  liveText: 'thinking about it',
  stopped: false,
  networkError: false,
  thinking: '',
  question: null,
  codeText: '',
  tables: [],
  error: null,
  artifact: null,
  startedAt: null,
  ...overrides,
});

function renderList(live: LiveRun | null = null, optimisticUserText: string | null = null) {
  return render(
    <MessageList
      messages={[message('m1', 'USER', 'Run SPC'), message('m2', 'AI', 'Done.')]}
      live={live}
      optimisticUserText={optimisticUserText}
      lastRunDurationMs={null}
      onAnswer={() => {}}
    />,
  );
}

/** jsdom reports zero for every scroll metric, so the box is given a real geometry:
 *  1000px of content in a 200px viewport. */
function giveGeometry(log: HTMLElement) {
  Object.defineProperty(log, 'scrollHeight', { value: 1000, configurable: true });
  Object.defineProperty(log, 'clientHeight', { value: 200, configurable: true });
}

describe('MessageList auto-scroll', () => {
  beforeEach(() => {
    useActiveRunStore.setState(useActiveRunStore.getInitialState());
  });

  it('stays where the reader scrolled when the list merely re-renders', () => {
    const view = renderList(liveRun());
    const log = screen.getByRole('log');
    giveGeometry(log);

    // The reader scrolled well away from the bottom to read an earlier turn.
    log.scrollTop = 100;
    fireEvent.scroll(log);

    // A re-render with a fresh live object (same run, new identity — what any store
    // change causes) must not yank them back down.
    view.rerender(
      <MessageList
        messages={[message('m1', 'USER', 'Run SPC'), message('m2', 'AI', 'Done.')]}
        live={liveRun()}
        optimisticUserText={null}
        lastRunDurationMs={null}
        onAnswer={() => {}}
      />,
    );

    expect(log.scrollTop).toBe(100);
  });

  it('follows the newest content when the reader is at the bottom', () => {
    const view = renderList(liveRun());
    const log = screen.getByRole('log');
    giveGeometry(log);

    log.scrollTop = 930; // 1000 − 930 − 200 < 0: hard against the bottom.
    fireEvent.scroll(log);

    view.rerender(
      <MessageList
        messages={[message('m1', 'USER', 'Run SPC'), message('m2', 'AI', 'Done. More.')]}
        live={liveRun({ liveText: 'still going' })}
        optimisticUserText={null}
        lastRunDurationMs={null}
        onAnswer={() => {}}
      />,
    );

    expect(log.scrollTop).toBe(1000);
  });

  it("jumps to the bottom for the reader's own send, wherever they were", () => {
    const view = renderList();
    const log = screen.getByRole('log');
    giveGeometry(log);

    log.scrollTop = 100;
    fireEvent.scroll(log);

    view.rerender(
      <MessageList
        messages={[message('m1', 'USER', 'Run SPC'), message('m2', 'AI', 'Done.')]}
        live={null}
        optimisticUserText="One more thing"
        lastRunDurationMs={null}
        onAnswer={() => {}}
      />,
    );

    expect(log.scrollTop).toBe(1000);
  });
});
