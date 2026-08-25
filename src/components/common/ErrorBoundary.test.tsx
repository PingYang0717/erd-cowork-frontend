import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary';

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

    expect(screen.getByRole('alert')).toHaveTextContent('這個區塊載入失敗');
    expect(screen.getByText('連線中斷')).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: '重試' }));

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
});
