import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { en } from '@/i18n/en';
import { useThemeStore } from '@/stores/useThemeStore';
import App from './App';

const openSettings = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(await screen.findByRole('button', { name: 'Settings' }));

/** antd's Segmented hides the radio and lets the surrounding `<label>` take the click,
 *  so the accessible element and the clickable one are not the same node. */
const chooseTheme = async (user: ReturnType<typeof userEvent.setup>, label: string) => {
  const radio = await screen.findByRole('radio', { name: label });
  await user.click(radio.closest('label') as HTMLElement);
};

describe('App theme shell', () => {
  beforeEach(() => {
    useThemeStore.setState({ isDarkMode: false });
  });

  /** Closed and reopened before asserting, on purpose. Segmented leaves the clicked
   *  input's `checked` out of step with its own selection for the rest of that render —
   *  and asserting the mark the moment it was clicked would only prove the click landed.
   *  What matters is that the choice was kept, which is what a freshly opened panel
   *  shows. */
  it('remembers the theme chosen in the settings panel', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openSettings(user);
    await chooseTheme(user, en.settings.themeDark);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await openSettings(user);

    expect(await screen.findByRole('radio', { name: en.settings.themeDark })).toBeChecked();
  });

  it('keeps the chosen theme after a simulated reload', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await openSettings(user);
    await chooseTheme(user, en.settings.themeDark);
    unmount();

    // A real reload re-executes every module from scratch, so the store is
    // re-created and only recovers the prior choice by reading it back out
    // of localStorage. Reset the module registry to reproduce that, rather
    // than reusing the same in-memory store instance across "reloads".
    vi.resetModules();
    const { default: ReloadedApp } = await import('./App');

    render(<ReloadedApp />);
    await openSettings(user);

    expect(await screen.findByRole('radio', { name: en.settings.themeDark })).toBeChecked();
  });
});
