import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/i18n/en';
import { useLanguageStore } from '@/stores/useLanguageStore';

import ErrorBoundary from './ErrorBoundary';

function Explode({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('連線中斷');
  }
  return <p>載入完成</p>;
}

describe('ErrorBoundary', () => {
  it('shows what failed instead of taking the page down with it', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Explode shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('This section failed to load');
    expect(screen.getByText('連線中斷')).toBeInTheDocument();
  });

  // The app has no mock backend to fall back on (ADR-0006), so "the backend is not
  // running" is the failure a developer meets most often. It must not read as a bug.
  it('names an unreachable backend instead of showing axios’s "Network Error"', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    function ExplodeOffline(): never {
      throw new AxiosError('Network Error', 'ERR_NETWORK');
    }

    render(
      <ErrorBoundary>
        <ExplodeOffline />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Cannot reach the backend');
    expect(screen.queryByText('Network Error')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('remounts the subtree when the user retries', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();

    // Whatever went wrong is fixed between the failure and the retry, so the retry is
    // what makes the subtree render again.
    let broken = true;
    function Subject() {
      return <Explode shouldThrow={broken} />;
    }

    render(
      <ErrorBoundary>
        <Subject />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();

    broken = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(screen.getByText('載入完成')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('hands the error to a custom fallback when one is given', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={(error) => <p>壞掉了：{error.message}</p>}>
        <Explode shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText('壞掉了：連線中斷')).toBeInTheDocument();
  });

  /** The panel used to read the language once, when it first painted: it was rendered by
   *  a class, and a class cannot subscribe. Switching language with an error on screen
   *  left the old words there until something remounted it. */
  it('follows a language change while the error is on screen', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // The suite is pinned to English (setup.ts); the switch under test goes the
    // other way, to the app's own default.
    render(
      <ErrorBoundary>
        <Explode shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: en.common.retry })).toBeInTheDocument();

    act(() => useLanguageStore.setState({ language: 'zh-TW' }));

    expect(screen.getByRole('button', { name: '重試' })).toBeInTheDocument();
  });
});
