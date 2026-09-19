import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FESTIVAL_PREVIEW_STORAGE_KEY } from '@/constants/storage';
import { useFestiveStore } from '@/stores/useFestiveStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { renderStudio } from '@/test/renderStudio';

const strings = () => document.querySelectorAll('[data-festive-rail="string"]');

/** The rail's own echo of the header: the rule under the nav rows becomes the hung
 *  string. (The weather and the floor are the shared scene, tested with
 *  FestiveFloor.) Forced on through the preview key; decoration only. */
describe('Session rail festive string', () => {
  afterEach(() => {
    vi.useRealTimers();
    useFestiveStore.setState({ enabled: true });
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
  });

  it('keeps the plain rule on an ordinary day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 3));
    renderStudio();
    await screen.findByRole('button', { name: 'New chat' });

    expect(strings()).toHaveLength(0);
    expect(screen.getByRole('navigation', { name: 'Shortcuts' })).not.toHaveAttribute('data-festive');
  });

  it('hangs the string under the nav rows, out of the reader’s way', async () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'christmas');
    renderStudio();
    await screen.findByRole('button', { name: 'New chat' });

    expect(strings()).toHaveLength(1);
    expect(strings()[0]).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('navigation', { name: 'Shortcuts' })).toHaveAttribute('data-festive', 'true');
    expect(screen.getByRole('button', { name: /^Artifacts/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skills' })).toBeInTheDocument();
  });

  it('goes with the header when the switch is off', async () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'lunarNewYear');
    useFestiveStore.setState({ enabled: false });
    renderStudio();
    await screen.findByRole('button', { name: 'New chat' });

    expect(strings()).toHaveLength(0);
  });

  it('keeps a short string in the divider’s place when the rail is collapsed', async () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'midAutumn');
    const user = userEvent.setup();
    renderStudio();
    await user.click(await screen.findByRole('button', { name: 'Collapse session list' }));
    await screen.findByRole('button', { name: 'Expand session list' });

    expect(strings()).toHaveLength(1);
  });
});
