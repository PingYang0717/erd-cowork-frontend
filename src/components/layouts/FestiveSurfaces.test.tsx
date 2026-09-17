import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ThreadPanel from '@/components/chat/ThreadPanel';
import { FESTIVAL_PREVIEW_STORAGE_KEY } from '@/constants/storage';
import { useFestiveStore } from '@/stores/useFestiveStore';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { appWrapper } from '@/test/appHarness';
import { renderStudio } from '@/test/renderStudio';

/** React listens for the vendor-prefixed name here: jsdom has no `AnimationEvent`
 *  but does have `WebkitAnimation` on a style, which is React's cue to bind
 *  `webkitAnimationEnd` instead of `animationend`. Firing both keeps the test honest
 *  about which element ended, whichever name is bound. */
const endAnimation = (element: Element) => {
  fireEvent.animationEnd(element);
  fireEvent(element, new Event('webkitAnimationEnd', { bubbles: true }));
};

const floors = () =>
  Array.from(document.querySelectorAll('[data-festive-floor]')).map((el) => el.getAttribute('data-festive-floor'));

const weathers = () =>
  Array.from(document.querySelectorAll('[data-festive-weather]')).map((el) => el.getAttribute('data-festive-weather'));

const walkers = () => Array.from(document.querySelectorAll<HTMLElement>('[data-festive-walker]'));

/** The Studio with a fresh draft open: the seeded session that landing opens has
 *  artifacts, and a draft has none, so this is the state in which the Artifact pane is
 *  empty and carries its stretch of the floor. */
const renderStudioOnDraft = async () => {
  const user = userEvent.setup();
  renderStudio();
  await user.click(await screen.findByRole('button', { name: 'New chat' }));
  await screen.findByText('No artifact yet');
  return user;
};

/** The scene below the header — the weather over each empty surface and the one floor
 *  along the window's foot — forced on through the preview key the way someone checking
 *  it outside the dates would. Decoration only: hidden from readers, and every row and
 *  button keeps its name. */
describe('The festive surfaces', () => {
  // Before, not after: the after hooks run ahead of the previous case's unmount, and its
  // landing effect would select a session again behind a reset made there.
  beforeEach(() => {
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
  });

  afterEach(() => {
    vi.useRealTimers();
    useFestiveStore.setState({ enabled: true });
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
  });

  it('shows nothing on an ordinary day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 3));
    renderStudio();
    await screen.findByRole('button', { name: 'New chat' });

    expect(floors()).toEqual([]);
    expect(weathers()).toEqual([]);
  });

  /** With a draft open the thread pane shows its start state over the composer; its
   *  stretch of the floor runs behind the composer, at the pane's foot. */
  it('lets the snow in over every empty surface and lays one floor through all three', async () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'christmas');
    await renderStudioOnDraft();

    expect(weathers()).toEqual(['rail', 'chat', 'artifact']);
    expect(floors()).toEqual(['rail', 'chat', 'artifact']);
    for (const piece of document.querySelectorAll('[data-festive-floor], [data-festive-weather]')) {
      expect(piece).toHaveAttribute('aria-hidden', 'true');
    }
    expect(screen.getByRole('button', { name: /^Artifacts/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skills' })).toBeInTheDocument();
  });

  /** Every floor draws the walker — the same one, fixed to the window and clipped to the
   *  floor — and every copy is handed its place in the loop from the clock rather than
   *  from its own mount time, so the copies agree. */
  it('draws the one walker on every floor, each copy at the same point in the loop', async () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'christmas');
    await renderStudioOnDraft();

    const copies = walkers();
    expect(copies).toHaveLength(3);
    for (const copy of copies) {
      expect(copy.getAttribute('data-festive-walker')).toBe('christmas');
      expect(copy.style.animationDelay).toMatch(/^-\d+(\.\d+)?s$/);
    }
    // Read moments apart, the two delays are moments apart — not a mount time apart.
    const delays = copies.map((copy) => parseFloat(copy.style.animationDelay));
    expect(Math.abs(delays[0] - delays[1])).toBeLessThan(1);
  });

  it('gives each floor its ground, drawn first so every piece stands in front of it', async () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'christmas');
    await renderStudioOnDraft();

    for (const floor of document.querySelectorAll('[data-festive-floor]')) {
      const backdrop = floor.querySelector('[data-festive-ground="backdrop"]');
      expect(floor.firstElementChild).toBe(backdrop);
      expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('has no weather for Halloween, whose sky drops nothing either, but still the floor', async () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'halloween');
    await renderStudioOnDraft();

    expect(weathers()).toEqual([]);
    expect(floors()).toEqual(['rail', 'chat', 'artifact']);
  });

  it('goes with the header when the switch is off', async () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'lunarNewYear');
    useFestiveStore.setState({ enabled: false });
    await renderStudioOnDraft();

    expect(floors()).toEqual([]);
    expect(weathers()).toEqual([]);
  });

  it('plays a piece its turn on a click, and stands it still again when the turn ends', async () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'lunarNewYear');
    await renderStudioOnDraft();
    const drum = document.querySelector('[data-festive-floor="artifact"] [data-piece="drum"]')!;

    fireEvent.click(drum);
    expect(drum).toHaveAttribute('data-poked', 'true');
    // The beat rings out while the turn plays: two arcs over the drum.
    expect(drum.querySelectorAll('path').length).toBeGreaterThan(3);

    // The sticks' own beat ending inside the piece does not end the turn.
    endAnimation(drum.firstElementChild!);
    expect(drum).toHaveAttribute('data-poked', 'true');
    endAnimation(drum);
    expect(drum).not.toHaveAttribute('data-poked');
    // Only the piece's own click is its turn: the rail's pieces stand still.
    expect(document.querySelector('[data-festive-floor="rail"] [data-poked]')).toBeNull();
  });

  it('keeps one piece and the passing walker on the collapsed rail', async () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'midAutumn');
    const user = await renderStudioOnDraft();
    await user.click(screen.getByRole('button', { name: 'Collapse session list' }));
    await screen.findByRole('button', { name: 'Expand session list' });

    expect(floors()).toEqual(['compact', 'chat', 'artifact']);
    const compact = document.querySelector('[data-festive-floor="compact"]')!;
    expect(compact.querySelectorAll('[data-piece]')).toHaveLength(1);
    expect(compact.querySelector('[data-festive-walker]')).not.toBeNull();
  });

  /** The thread pane's floor is the pane's, not the conversation's: it is there with no
   *  conversation open as well. */
  it('lays the floor through the thread pane with no conversation open', () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'christmas');
    // Rendered alone there is nothing to open a draft, so the pane stays without one.
    render(
      <MemoryRouter>
        <ThreadPanel />
      </MemoryRouter>,
      { wrapper: appWrapper() }
    );

    expect(weathers()).toEqual(['chat']);
    expect(floors()).toEqual(['chat']);
  });
});
