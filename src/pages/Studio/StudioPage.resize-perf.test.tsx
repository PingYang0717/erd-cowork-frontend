import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { renderStudio } from '@/test/renderStudio';
import { answerAnalysisConditions } from '@/test/studioRun';

/** Counts how many times each pane's subtree re-renders while a divider
 *  is dragged. A drag emits one mousemove per frame; anything that re-renders per
 *  mousemove is on the critical path for smoothness. */
const renderCounts = { ArtifactFrame: 0, MessageList: 0 };

vi.mock('@/components/artifact/ArtifactFrame', async () => {
  const actual = await vi.importActual<typeof import('@/components/artifact/ArtifactFrame')>(
    '@/components/artifact/ArtifactFrame',
  );
  const Real = actual.default;
  const Counted: React.FC<React.ComponentProps<typeof Real>> = (props) => {
    renderCounts.ArtifactFrame += 1;
    return <Real {...props} />;
  };
  return { ...actual, default: Counted };
});

vi.mock('@/components/chat/MessageList', async () => {
  const actual = await vi.importActual<typeof import('@/components/chat/MessageList')>(
    '@/components/chat/MessageList',
  );
  const Real = actual.default;
  const Counted: React.FC<React.ComponentProps<typeof Real>> = (props) => {
    renderCounts.MessageList += 1;
    return <Real {...props} />;
  };
  return { ...actual, default: Counted };
});

/** One drag = 20 mousemoves, the number a real ~300ms drag emits at 60fps. */
const drag = (handleName: string, steps = 20) => {
  const handle = screen.getByRole('separator', { name: handleName });
  fireEvent.pointerDown(handle, { clientX: 500 });
  for (let step = 0; step < steps; step += 1) {
    fireEvent.pointerMove(window, { clientX: 500 + step, buttons: 1 });
  }
  fireEvent.pointerUp(window);
};

describe('divider drag does not re-render the panes', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    renderCounts.ArtifactFrame = 0;
    renderCounts.MessageList = 0;
  });

  /** Drives the Studio into the state the bug happens in: a thread with messages and
   *  an artifact in the right pane. Empty panes have nothing to re-render. */
  const openAThreadWithAnArtifact = async () => {
    const user = userEvent.setup();
    renderStudio();
    await user.click(await screen.findByRole('button', { name: 'New chat' }));
    await screen.findByRole('button', { name: 'New analysis' });
    await screen.findByRole('textbox', { name: 'Message' });
    await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
    await answerAnalysisConditions(user);
    await screen.findByRole('button', { name: /^Worked through \d+ steps$/ });
    await screen.findByTitle('Artifact preview');
  };

  it('the probe is wired — a rendered pane increments it', async () => {
    await openAThreadWithAnArtifact();
    expect(renderCounts.ArtifactFrame).toBeGreaterThan(0);
    expect(renderCounts.MessageList).toBeGreaterThan(0);
  });

  /** The invariant that matters: a drag costs the same whether the pointer moved 20
   *  times or 60. One commit on release is by design; per-mousemove work is the bug. */
  it('the thread divider costs one render per drag, not one per mousemove', async () => {
    await openAThreadWithAnArtifact();

    renderCounts.ArtifactFrame = 0;
    renderCounts.MessageList = 0;
    drag('Resize thread panel', 20);
    const shortDrag = { ...renderCounts };

    renderCounts.ArtifactFrame = 0;
    renderCounts.MessageList = 0;
    drag('Resize thread panel', 60);
    const longDrag = { ...renderCounts };

    expect(longDrag).toEqual(shortDrag);
    expect(shortDrag.ArtifactFrame).toBeLessThanOrEqual(1);
    expect(shortDrag.MessageList).toBeLessThanOrEqual(1);
  });

  it('the session rail divider costs one render per drag, not one per mousemove', async () => {
    await openAThreadWithAnArtifact();

    renderCounts.ArtifactFrame = 0;
    renderCounts.MessageList = 0;
    drag('Resize session rail', 20);
    const shortDrag = { ...renderCounts };

    renderCounts.ArtifactFrame = 0;
    renderCounts.MessageList = 0;
    drag('Resize session rail', 60);

    expect({ ...renderCounts }).toEqual(shortDrag);
    expect(shortDrag.ArtifactFrame).toBeLessThanOrEqual(1);
    expect(shortDrag.MessageList).toBeLessThanOrEqual(1);
  });
});
