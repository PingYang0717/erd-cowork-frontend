import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FESTIVAL_PREVIEW_STORAGE_KEY } from '@/constants/storage';
import { useFestiveStore } from '@/stores/useFestiveStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { renderStudio } from '@/test/renderStudio';

/** React listens for the vendor-prefixed name here: jsdom has no `AnimationEvent`
 *  but does have `WebkitAnimation` on a style, which is React's cue to bind
 *  `webkitAnimationEnd` instead of `animationend`. Firing both keeps the test honest
 *  about which element ended, whichever name is bound. */
const endAnimation = (element: Element) => {
  fireEvent.animationEnd(element);
  fireEvent(element, new Event('webkitAnimationEnd', { bubbles: true }));
};

const echoes = () =>
  Array.from(document.querySelectorAll('[data-festive-rail]')).map((el) => el.getAttribute('data-festive-rail'));

/** The rail's three echoes of the header's scene, forced on through the preview key the
 *  way someone checking them outside the dates would. Decoration only: hidden from
 *  readers, and every row and button keeps its name. */
describe('Session rail festive echoes', () => {
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

    expect(echoes()).toEqual([]);
    expect(screen.getByRole('navigation', { name: 'Shortcuts' })).not.toHaveAttribute('data-festive');
  });

  it('hangs the string, lets the snow in and lays the ground for Christmas, out of the reader’s way', async () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'christmas');
    renderStudio();
    await screen.findByRole('button', { name: 'New chat' });

    expect(echoes()).toEqual(['weather', 'string', 'ground']);
    for (const echo of document.querySelectorAll('[data-festive-rail]')) {
      expect(echo).toHaveAttribute('aria-hidden', 'true');
    }
    expect(screen.getByRole('navigation', { name: 'Shortcuts' })).toHaveAttribute('data-festive', 'true');
    expect(screen.getByRole('button', { name: /^Artifacts/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skills' })).toBeInTheDocument();
  });

  it('has no weather for Halloween, whose sky drops nothing either', async () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'halloween');
    renderStudio();
    await screen.findByRole('button', { name: 'New chat' });

    expect(echoes()).toEqual(['string', 'ground']);
  });

  it('goes with the header when the switch is off', async () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'lunarNewYear');
    useFestiveStore.setState({ enabled: false });
    renderStudio();
    await screen.findByRole('button', { name: 'New chat' });

    expect(echoes()).toEqual([]);
  });

  it('plays a piece its turn on a click, and stands it still again when the turn ends', async () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'lunarNewYear');
    renderStudio();
    await screen.findByRole('button', { name: 'New chat' });
    const ingots = document.querySelector('[data-piece="ingots"]')!;

    fireEvent.click(ingots);
    expect(ingots).toHaveAttribute('data-poked', 'true');
    // Coins fly off while the turn plays.
    expect(ingots.querySelectorAll('circle').length).toBeGreaterThan(0);

    // The lights inside a piece never end; only the piece's own animation clears it.
    endAnimation(ingots.firstElementChild!);
    expect(ingots).toHaveAttribute('data-poked', 'true');
    endAnimation(ingots);
    expect(ingots).not.toHaveAttribute('data-poked');
    expect(ingots.querySelectorAll('circle').length).toBe(0);
  });

  it('has one walker crossing the floor, and none on the collapsed rail', async () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'christmas');
    const user = userEvent.setup();
    renderStudio();
    await screen.findByRole('button', { name: 'New chat' });
    expect(document.querySelectorAll('[data-festive-walker]').length).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Collapse session list' }));
    await screen.findByRole('button', { name: 'Expand session list' });
    expect(document.querySelectorAll('[data-festive-walker]').length).toBe(0);
  });

  it('keeps a short string and one piece on the floor when the rail is collapsed', async () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'midAutumn');
    const user = userEvent.setup();
    renderStudio();
    await user.click(await screen.findByRole('button', { name: 'Collapse session list' }));
    await screen.findByRole('button', { name: 'Expand session list' });

    expect(echoes()).toEqual(['string', 'ground']);
  });
});
