import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { FESTIVAL_PREVIEW_STORAGE_KEY } from '@/constants/storage';
import { useFestiveStore } from '@/stores/useFestiveStore';
import ThreadEmptyFestive from './ThreadEmptyFestive';

/** The empty thread's own echo of the header's scene: a slip of ground under the words.
 *  Decoration, on the same switch and the same calendar as every other dressed surface. */
describe('The empty thread’s festive ground', () => {
  beforeEach(() => {
    localStorage.clear();
    useFestiveStore.setState(useFestiveStore.getInitialState());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('draws nothing on an ordinary day', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 3));
    const { container } = render(<ThreadEmptyFestive />);

    expect(container).toBeEmptyDOMElement();
  });

  it('stands the festival’s pieces on its ground, out of the reader’s way', () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'christmas');
    const { container } = render(<ThreadEmptyFestive />);

    const scene = container.querySelector('[data-festive-empty="christmas"]');
    expect(scene).toHaveAttribute('aria-hidden', 'true');
    // The snowman and the tree, standing in front of the ground drawn behind them.
    expect(scene?.querySelectorAll('svg')).toHaveLength(3);
  });

  it('goes with the switch, like every other dressed surface', () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'lunarNewYear');
    useFestiveStore.setState({ enabled: false });
    const { container } = render(<ThreadEmptyFestive />);

    expect(container).toBeEmptyDOMElement();
  });
});
