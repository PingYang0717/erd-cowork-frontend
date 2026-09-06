import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SettingsMenu from '@/components/common/SettingsMenu';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { appWrapper } from '@/test/appHarness';
import { en } from './en';
import { zhTW } from './zhTW';

const renderSettings = () => render(<SettingsMenu variant="rail" />, { wrapper: appWrapper() });

/** Opens the panel. Separate from choosing, because the trigger toggles: pressing it
 *  again closes the panel, and the leaving node is still in the DOM but no longer
 *  clickable — a confusing way to fail. */
const openSettings = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Settings' }));

/** Picks a language from the open panel. antd's Segmented hides the radio itself and
 *  lets the surrounding `<label>` take the click, so the accessible element and the
 *  clickable one are not the same node. */
const chooseLanguage = async (user: ReturnType<typeof userEvent.setup>, label: string) => {
  const radio = await screen.findByRole('radio', { name: label });
  await user.click(radio.closest('label') as HTMLElement);
};

/** The switch itself, not the wording it produces. The rest of the suite is pinned to
 *  English (setup.ts) and asserts behaviour rather than language; these are the few
 *  cases that exist to prove the switch works from the app's own default — and that
 *  the two dictionaries are not the same object wearing two names. */
describe('Switching the interface language', () => {
  // From the app's real starting point, not the test suite's pinned language.
  beforeEach(() => {
    useLanguageStore.setState({ language: 'zh-TW' });
  });

  /** The settings panel is itself dictionary-driven, so it is both the control and a
   *  surface that has to repaint — which is why the assertion can stay on one component
   *  without weakening. Asserted here rather than against a dialog: an open antd Modal
   *  sets `pointer-events: none` on everything outside it, so a test that renders one
   *  cannot reach the very control it means to press. */
  it('repaints the copy in English, and back again', async () => {
    const user = userEvent.setup();
    renderSettings();

    await openSettings(user);
    expect(await screen.findByText(zhTW.settings.theme)).toBeInTheDocument();

    await chooseLanguage(user, zhTW.settings.languageEn);

    expect(await screen.findByText(en.settings.theme)).toBeInTheDocument();
    expect(screen.queryByText(zhTW.settings.theme)).not.toBeInTheDocument();

    await chooseLanguage(user, en.settings.languageZh);

    expect(await screen.findByText(zhTW.settings.theme)).toBeInTheDocument();
  });

  /** The trigger opens a panel, and a reader has to hear that — the same contract
   *  VersionSwitcher's trigger keeps (ADR-0014 §menu-keyboard). antd's Popover adds nothing to a custom
   *  child, so the button carries the state itself. */
  it('announces the popup and its open state on the trigger', async () => {
    const user = userEvent.setup();
    renderSettings();

    const trigger = screen.getByRole('button', { name: 'Settings' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  /** The dialog keyboard contract the repo adopted (ADR-0014 §menu-keyboard/§dialog-focus): Escape closes and puts
   *  focus back on the opener — antd's Popover does neither for a custom child. */
  it('closes on Escape and hands focus back to the trigger', async () => {
    const user = userEvent.setup();
    renderSettings();

    const trigger = screen.getByRole('button', { name: 'Settings' });
    await user.click(trigger);
    expect(await screen.findByText(zhTW.settings.theme)).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  /** Both languages are named, and the one in use is marked — a reader who cannot read
   *  the current interface still has to be able to find their own. A toggle showing only
   *  the destination could not do that. */
  it('names both languages and marks the one in use', async () => {
    const user = userEvent.setup();
    renderSettings();

    await openSettings(user);

    expect(await screen.findByRole('radio', { name: zhTW.settings.languageZh })).toBeChecked();
    expect(screen.getByRole('radio', { name: zhTW.settings.languageEn })).not.toBeChecked();
  });

  /** A string that takes a value is a function in both dictionaries, so the two are free
   *  to put the value where their own grammar wants it. This checks the English one is
   *  actually written that way rather than repeating the Chinese sentence. */
  it('renders a value-carrying string with the chosen language grammar', () => {
    expect(zhTW.share.minChars(3)).toBe('請至少輸入 3 個字元');
    expect(en.share.minChars(3)).toBe('Type at least 3 characters');
  });

  /** Every key in the Chinese copy has a distinct English counterpart. A key copied over
   *  untranslated compiles perfectly and is invisible until someone switches. */
  it('has no English entry left as a copy of the Chinese one', () => {
    const untranslated = Object.entries(zhTW.share)
      .filter(([key, value]) => typeof value === 'string' && value === (en.share as Record<string, unknown>)[key])
      // `Submit` is the same word in both — a label the product uses as-is, not a gap.
      .filter(([key]) => key !== 'submit');

    expect(untranslated).toEqual([]);
  });
});
