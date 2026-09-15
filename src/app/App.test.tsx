import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { en } from '@/i18n/en';
import { useThemeStore } from '@/stores/useThemeStore';
import App from './App';

const openPreferences = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(await screen.findByRole('button', { name: 'Preferences' }));

/** The theme row: one button whose name is its label plus the theme in use. */
const themeRow = () => screen.findByRole('button', { name: new RegExp(`^${en.settings.theme}`) });

describe('App theme shell', () => {
  beforeEach(() => {
    useThemeStore.setState({ isDarkMode: false });
  });

  /** Closed and reopened before asserting, on purpose: what matters is that the choice
   *  was kept, which is what a freshly opened panel shows. */
  it('remembers the theme chosen in the preferences panel', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openPreferences(user);
    await user.click(await themeRow());
    await user.click(screen.getByRole('button', { name: 'Preferences' }));
    await openPreferences(user);

    expect(await themeRow()).toHaveTextContent(en.settings.themeDark);
  });

  it('keeps the chosen theme after a simulated reload', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await openPreferences(user);
    await user.click(await themeRow());
    unmount();

    // A real reload re-executes every module from scratch, so the store is
    // re-created and only recovers the prior choice by reading it back out
    // of localStorage. Reset the module registry to reproduce that, rather
    // than reusing the same in-memory store instance across "reloads".
    vi.resetModules();
    const { default: ReloadedApp } = await import('./App');

    render(<ReloadedApp />);
    await openPreferences(user);

    expect(await themeRow()).toHaveTextContent(en.settings.themeDark);
  });
});
