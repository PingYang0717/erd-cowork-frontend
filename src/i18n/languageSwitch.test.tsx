import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AppHeader from '@/components/layouts/AppHeader';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { appWrapper } from '@/test/appHarness';
import { en } from './en';
import { zhTW } from './zhTW';

const renderHeader = () =>
  render(
    <MemoryRouter>
      <AppHeader />
    </MemoryRouter>,
    { wrapper: appWrapper() }
  );

/** Opens the account menu. Separate from choosing, because the trigger toggles: pressing
 *  it again closes the panel, and the leaving node is still in the DOM but no longer
 *  clickable — a confusing way to fail. */
const openAccount = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Account' }));

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
 *  the two dictionaries are not the same object wearing two names.
 *
 *  Asserted against the account menu since the preferences moved there from the rail's
 *  Settings entry. It is still both the control and a surface that has to repaint, which
 *  is what lets the assertion stay on one component without weakening. */
describe('Switching the interface language', () => {
  // From the app's real starting point, not the test suite's pinned language.
  beforeEach(() => {
    useLanguageStore.setState({ language: 'zh-TW' });
  });

  it('repaints the copy in English, and back again', async () => {
    const user = userEvent.setup();
    renderHeader();

    await openAccount(user);
    expect(await screen.findByText(zhTW.settings.theme)).toBeInTheDocument();

    await chooseLanguage(user, zhTW.settings.languageEn);

    expect(await screen.findByText(en.settings.theme)).toBeInTheDocument();
    expect(screen.queryByText(zhTW.settings.theme)).not.toBeInTheDocument();

    await chooseLanguage(user, en.settings.languageZh);

    expect(await screen.findByText(zhTW.settings.theme)).toBeInTheDocument();
  });

  /** The trigger opens a panel, and a reader has to hear that — the same contract
   *  VersionSwitcher's trigger keeps (ADR-0014 §menu-keyboard). antd's Popover adds
   *  nothing to a custom child, so the button carries the state itself. */
  it('announces the popup and its open state on the trigger', async () => {
    const user = userEvent.setup();
    renderHeader();

    const trigger = screen.getByRole('button', { name: 'Account' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});
