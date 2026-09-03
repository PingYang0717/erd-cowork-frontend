import { render, screen } from '@testing-library/react';
import { Dropdown, Modal } from 'antd';
import { describe, expect, it } from 'vitest';

import AppProviders from './providers';

/** The selectors antd emits the shortened `--ant-motion-duration-*` under. A component
 *  token that silently fails to apply looks exactly like one that was never set, so these
 *  tests check the token actually reaches the generated CSS.
 *
 *  The duration is 10ms rather than 0s deliberately, and the assertion says so: a
 *  zero-duration CSS transition fires no `transitionend`, and rc-motion waits for that
 *  event before unmounting a closed overlay. Under `0s` a dismissed Modal left its mask
 *  in the DOM — invisible, but still swallowing clicks and holding the focus lock.
 *
 *  This does couple to antd's CSS-variable emission (the `<component>-css-var` scope
 *  class). If a future antd changes that format these break — which is the point: the
 *  alternative is losing the setting without noticing. */
const INSTANT_DURATION = '0.01s';

const instantDurationScopes = (): string[] => {
  return Array.from(document.querySelectorAll('style'))
    .flatMap((tag) => (tag.textContent ?? '').split('}'))
    .filter((rule) => rule.includes(`--ant-motion-duration-mid:${INSTANT_DURATION}`))
    .map((rule) => rule.split('{')[0].trim());
};

/** No overlay duration may be `0s`, whatever else changes: that is the value that broke
 *  mask cleanup, and it is the one a future "make it instant" edit would reach for.
 *
 *  All three tokens, not just `mid`. `fast` drives `zoom-big-fast-leave` — the Modal's
 *  own exit — so checking one of the three would have let the identical bug back in
 *  under a different name. */
const DURATION_TOKENS = ['fast', 'mid', 'slow'] as const;

const zeroDurationTokens = (): string[] => {
  const css = Array.from(document.querySelectorAll('style'))
    .map((tag) => tag.textContent ?? '')
    .join('');
  return DURATION_TOKENS.filter((token) => css.includes(`--ant-motion-duration-${token}:0s`));
};

describe('overlays open without a perceptible enter animation', () => {
  it('the modal and its mask sit in an instant-duration scope', async () => {
    render(
      <AppProviders>
        <Modal open title="Attach files">
          body
        </Modal>
      </AppProviders>,
    );
    await screen.findByText('Attach files');

    // The scope class lands on `.ant-modal-root`, so the zoom-in panel and the fading
    // mask are both inside it — the dialog and its backdrop appear together, at once.
    const scope = document.querySelector('.ant-modal-css-var');
    expect(scope).not.toBeNull();
    expect(scope?.contains(document.querySelector('.ant-modal-mask'))).toBe(true);
    expect(scope?.contains(document.querySelector('.ant-modal-wrap'))).toBe(true);
    expect(instantDurationScopes().some((selector) => selector.includes('ant-modal-css-var'))).toBe(
      true,
    );
    // The regression that made this file worth having: `0s` leaves the mask behind.
    expect(zeroDurationTokens()).toEqual([]);
  });

  it('the dropdown menu sits in an instant-duration scope', async () => {
    render(
      <AppProviders>
        <Dropdown open menu={{ items: [{ key: 'rename', label: 'Rename' }] }}>
          <button type="button">More</button>
        </Dropdown>
      </AppProviders>,
    );
    await screen.findByText('Rename');

    // Here the scope class lands on the menu element itself — the same element that
    // carries the slide-up animation classes.
    const menu = document.querySelector('.ant-dropdown');
    expect(menu?.className).toContain('ant-dropdown-css-var');
    expect(
      instantDurationScopes().some((selector) => selector.includes('ant-dropdown-css-var')),
    ).toBe(true);
    expect(zeroDurationTokens()).toEqual([]);
  });
});
