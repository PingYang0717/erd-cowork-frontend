import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Tooltip from './Tooltip';

import styles from './Tooltip.module.css';

/** jsdom gives every element a zero rect, so the trigger's distance from the top of the
 *  viewport has to be stated for the flip to be exercised at all. */
const placeTriggerAt = (topPx: number) => {
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
};

describe('Tooltip', () => {
  it('opens above the trigger when there is room', async () => {
    const user = userEvent.setup();
    placeTriggerAt(400);
    render(
      <Tooltip content="重新生成">
        <button type="button">R</button>
      </Tooltip>
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
      </Tooltip>
    );

    await user.hover(screen.getByRole('button', { name: 'R' }));

    expect((await screen.findByRole('tooltip')).className).toContain(styles.tipBelow);
  });

  /** The Artifact toolbar: 60-odd px from the viewport top, but its pane clips and
   *  starts a few px above the buttons. Room is measured to the pane, not the viewport —
   *  otherwise the tip opens upward into the strip the pane slices off, and reads as the
   *  header covering it. */
  it('flips below when the trigger sits against the top of a clipping pane, wherever that pane is', async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const top = Number(this.dataset.top ?? 0);
      return { top, bottom: top + 32, left: 0, right: 32, width: 32, height: 32, x: 0, y: top, toJSON: () => ({}) };
    });
    render(
      <div data-top="56" style={{ overflow: 'hidden' }}>
        <div data-top="67">
          <Tooltip content="重新生成">
            <button type="button">R</button>
          </Tooltip>
        </div>
      </div>
    );
    // The wrapper span itself is what is measured; place it with the toolbar row.
    (screen.getByRole('button', { name: 'R' }).parentElement as HTMLElement).dataset.top = '67';

    await user.hover(screen.getByRole('button', { name: 'R' }));

    expect((await screen.findByRole('tooltip')).className).toContain(styles.tipBelow);
  });

  /** The toolbar's last button sits against the pane's right edge. Centred there, the
   *  tip ran off the pane — and off the screen with it — so it hangs from the trigger's
   *  right edge instead. Rects are stated per element: the pane and the trigger by a
   *  data attribute, the tip by its role, since it exists only once open. */
  it('hangs from the right edge when centring would run out of the pane', async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const rect = this.getAttribute('role') === 'tooltip' ? '0,120,0' : (this.dataset.rect ?? '0,0,400');
      const [left, width, top] = rect.split(',').map(Number);
      return {
        top,
        bottom: top + 32,
        left,
        right: left + width,
        width,
        height: 32,
        x: left,
        y: top,
        toJSON: () => ({}),
      };
    });
    render(
      <div data-rect="0,300,0" style={{ overflow: 'hidden' }}>
        <Tooltip content="在新分頁開啟預覽">
          <button type="button">O</button>
        </Tooltip>
      </div>
    );
    const trigger = screen.getByRole('button', { name: 'O' });
    // The wrapper span is what is measured: 32px wide, ending 8px short of the pane's edge.
    (trigger.parentElement as HTMLElement).dataset.rect = '260,32,400';

    await user.hover(trigger);

    const tip = await screen.findByRole('tooltip');
    await waitFor(() => expect(tip.className).toContain(styles.tipAlignRight));
    expect(tip.className).not.toContain(styles.tipBelow);
  });

  it('goes away again when the pointer leaves', async () => {
    const user = userEvent.setup();
    placeTriggerAt(400);
    render(
      <Tooltip content="重新生成">
        <button type="button">R</button>
      </Tooltip>
    );

    await user.hover(screen.getByRole('button', { name: 'R' }));
    await screen.findByRole('tooltip');

    await user.unhover(screen.getByRole('button', { name: 'R' }));

    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });

  /** Focus shows the tip immediately — the 0.35s delay is a pointer affordance, and a
   *  keyboard user has already committed to the control (ADR-0014 §tooltip-focus). The open tip is wired
   *  to the trigger with aria-describedby, which is what makes it announced at all. */
  it('shows on focus without the hover delay, and describes the trigger', async () => {
    const user = userEvent.setup();
    placeTriggerAt(400);
    render(
      <Tooltip content="重新整理">
        <button type="button">R</button>
      </Tooltip>
    );

    await user.tab();

    const trigger = screen.getByRole('button', { name: 'R' });
    expect(trigger).toHaveFocus();
    const tip = screen.getByRole('tooltip');
    expect(trigger).toHaveAttribute('aria-describedby', tip.id);
    expect(trigger).toHaveAccessibleDescription('重新整理');
  });
});
