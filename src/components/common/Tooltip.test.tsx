import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import Tooltip from './Tooltip';
import styles from './Tooltip.module.css';

/** jsdom gives every element a zero rect, so the trigger's distance from the top of the
 *  viewport has to be stated for the flip to be exercised at all. */
function placeTriggerAt(topPx: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top: topPx,
    bottom: topPx + 32,
    left: 0,
    right: 32,
    width: 32,
    height: 32,
    x: 0,
    y: topPx,
    toJSON: () => ({}),
  });
}

describe('Tooltip', () => {
  it('opens above the trigger when there is room', async () => {
    const user = userEvent.setup();
    placeTriggerAt(400);
    render(
      <Tooltip content="重新生成">
        <button type="button">R</button>
      </Tooltip>,
    );

    await user.hover(screen.getByRole('button', { name: 'R' }));

    const tip = await screen.findByRole('tooltip');
    expect(tip).toHaveTextContent('重新生成');
    expect(tip.className).not.toContain(styles.tipBelow);
  });

  it('flips below when the trigger sits against the top of its pane', async () => {
    const user = userEvent.setup();
    // A toolbar button 21px from the top — the panes clip anything above them.
    placeTriggerAt(21);
    render(
      <Tooltip content="重新生成">
        <button type="button">R</button>
      </Tooltip>,
    );

    await user.hover(screen.getByRole('button', { name: 'R' }));

    expect((await screen.findByRole('tooltip')).className).toContain(styles.tipBelow);
  });

  it('goes away again when the pointer leaves', async () => {
    const user = userEvent.setup();
    placeTriggerAt(400);
    render(
      <Tooltip content="重新生成">
        <button type="button">R</button>
      </Tooltip>,
    );

    await user.hover(screen.getByRole('button', { name: 'R' }));
    await screen.findByRole('tooltip');

    await user.unhover(screen.getByRole('button', { name: 'R' }));

    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });
});
