import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { FESTIVAL_PREVIEW_STORAGE_KEY } from '@/constants/storage';
import { appWrapper } from '@/test/appHarness';
import AppHeader from './AppHeader';

/** jsdom's default host is not on the festive list, which is exactly the case this file
 *  is about: a deployment that does not dress up. The calendar-driven cases live in
 *  AppHeader.test.tsx, which runs at a listed host. */
describe('AppHeader on a host that does not dress up', () => {
  const stage = () => document.querySelector('[data-festival]:not(button)');

  afterEach(() => vi.useRealTimers());

  it('stays plain even on Christmas Day', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 11, 25));
    render(<AppHeader />, { wrapper: appWrapper({ retry: false }) });

    expect(window.location.host).not.toBe('localhost:5199');
    expect(stage()).toBeNull();
  });

  /** The preview key is for looking at a festival wherever you are. */
  it('still shows a previewed festival', () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'halloween');
    render(<AppHeader />, { wrapper: appWrapper({ retry: false }) });

    expect(stage()).toHaveAttribute('data-festival', 'halloween');
  });
});
