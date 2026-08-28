import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type MessageBubbleModule from '@/components/chat/MessageBubble';
import { mockAgentStream } from '@/test/agentStream';
import { renderStudio } from '@/test/renderStudio';

/** Renders that made it PAST the memo boundary, split the way the cost splits: a
 *  settled history bubble re-rendering per token is waste; the live bubble re-rendering
 *  per token is the feature. */
const renderCounts = { history: 0, live: 0 };

vi.mock('@/components/chat/MessageBubble', async () => {
  const actual = await vi.importActual<{ default: typeof MessageBubbleModule }>(
    '@/components/chat/MessageBubble',
  );
  const Real = actual.default;
  type Props = React.ComponentProps<typeof Real>;
  // Re-create the memo boundary around a counting wrapper: the count increments only
  // when the props actually changed — exactly what the real memo would let through.
  const Counted = React.memo((props: Props) => {
    if (props.streaming !== undefined || props.timerStartedAt !== undefined) {
      renderCounts.live += 1;
    } else {
      renderCounts.history += 1;
    }
    return <Real {...props} />;
  });
  return { ...actual, default: Counted };
});

const { useSessionSelectionStore } = await import('@/stores/useSessionSelectionStore');
const { useActiveRunStore } = await import('@/stores/useActiveRunStore');

describe('streaming does not re-render settled bubbles', () => {
  beforeEach(() => {
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    useActiveRunStore.setState(useActiveRunStore.getInitialState());
    renderCounts.history = 0;
    renderCounts.live = 0;
  });

  /** The regression this pins down (probe-measured before the fix): the history bubble
   *  carrying an artifact chip re-rendered once per TOKEN — its `artifact` prop was a
   *  fresh object built in the JSX, and one fresh object prop is all it takes to defeat
   *  the memo. Text-only bubbles were fine, which is what made it easy to miss. */
  it('history bubbles (artifact chip included) stay quiet while tokens stream', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudio();

    // session-1's seeded history: one AI message with artifactId 'artifact-1'.
    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await screen.findByRole('textbox', { name: 'Message' });
    await user.type(screen.getByRole('textbox', { name: 'Message' }), '追問一句');
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    await screen.findByRole('status', { name: 'eRD AI is working' });

    renderCounts.history = 0;
    renderCounts.live = 0;
    for (let i = 0; i < 10; i += 1) {
      act(() => stream.push({ type: 'TOKEN', delta: `字${i} ` }));
    }
    await screen.findByText(/字9/);

    // The live bubble is supposed to follow the tokens; the settled history is not.
    expect(renderCounts.live).toBeGreaterThan(0);
    expect(renderCounts.history).toBe(0);

    act(() => stream.close());
  });

  /** Deliberately implementation-coupled: whether the export is wrapped in React.memo
   *  cannot be observed from outside — a counting wrapper would bring its own memo and
   *  pass either way (tried; it did). The memo is what keeps the composer (antd
   *  TextArea autoSize, the "+" Dropdown, two modals) from re-rendering 10-40×/s
   *  during a stream, and removing it is a one-line change nothing else would catch. */
  it('ChatComposer stays memoised', async () => {
    const { default: RealComposer } = await vi.importActual<{ default: object }>(
      '@/components/chat/ChatComposer',
    );
    expect((RealComposer as { $$typeof?: symbol }).$$typeof).toBe(Symbol.for('react.memo'));
  });

  /** Same reasoning, and here the memo is load-bearing for the deferred markdown parse:
   *  MessageBubble hands ReplyText a *deferred* copy of the streaming text, so on the
   *  per-token urgent render the text prop is unchanged — the memo is what turns that
   *  into "no Markdown parse at all". Remove it and the deferral silently buys nothing
   *  (jsdom cannot observe the difference; act() flushes deferred renders synchronously). */
  it('ReplyText stays memoised — the deferred parse depends on it', async () => {
    const { default: RealReplyText } = await vi.importActual<{ default: object }>(
      '@/components/chat/ReplyText',
    );
    expect((RealReplyText as { $$typeof?: symbol }).$$typeof).toBe(Symbol.for('react.memo'));
  });
});
