import { render, screen } from '@testing-library/react';
import { Dropdown, Modal } from 'antd';
import { describe, expect, it } from 'vitest';

import AppProviders from './providers';

/** The selectors antd emits `--ant-motion-duration-*: 0s` under. A component token that
 *  silently fails to apply looks exactly like one that was never set, so these tests
 *  check the token actually reaches the generated CSS.
 *
 *  This does couple to antd's CSS-variable emission (the `<component>-css-var` scope
 *  class). If a future antd changes that format these break — which is the point: the
 *  alternative is losing the setting without noticing. */
function zeroDurationScopes(): string[] {
  return Array.from(document.querySelectorAll('style'))
    .flatMap((tag) => (tag.textContent ?? '').split('}'))
    .filter((rule) => rule.includes('--ant-motion-duration-mid:0s'))
    .map((rule) => rule.split('{')[0].trim());
}

describe('overlays open without an enter animation', () => {
  it('the modal and its mask sit in a zero-duration scope', async () => {
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
    expect(zeroDurationScopes().some((selector) => selector.includes('ant-modal-css-var'))).toBe(
      true,
    );
  });

  it('the dropdown menu sits in a zero-duration scope', async () => {
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
    expect(zeroDurationScopes().some((selector) => selector.includes('ant-dropdown-css-var'))).toBe(
      true,
    );
  });
});
