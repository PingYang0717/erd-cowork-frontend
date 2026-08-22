import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useThemeStore } from '@/features/theme/store/useThemeStore';

import { App } from './App';

describe('App theme shell', () => {
  beforeEach(() => {
    useThemeStore.setState({ isDarkMode: false });
  });

  it('toggles between light and dark mode via the theme toggle control', async () => {
    const user = userEvent.setup();
    render(<App />);

    const toggle = screen.getByRole('button', { name: 'Switch to dark mode' });

    await user.click(toggle);

    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });

  it('keeps the chosen theme after a simulated reload', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    unmount();

    // A real reload re-executes every module from scratch, so the store is
    // re-created and only recovers the prior choice by reading it back out
    // of localStorage. Reset the module registry to reproduce that, rather
    // than reusing the same in-memory store instance across "reloads".
    vi.resetModules();
    const { App: ReloadedApp } = await import('./App');

    render(<ReloadedApp />);

    expect(await screen.findByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });
});
