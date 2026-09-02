import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ShareArtifactDialog from '@/components/artifact/ShareArtifactDialog';
import LanguageToggle from '@/components/common/LanguageToggle';
import { server } from '@/mocks/server';
import { useLanguageStore } from '@/stores/useLanguageStore';
import type { Artifact } from '@/types/api';

import { en } from './en';
import { zhTW } from './zhTW';

const artifact = {
  id: 'artifact-1',
  version: 1,
  sessionId: 'session-1',
  sessionTitle: 'SPC — Vt (gate CD)',
  title: 'SPC analysis — Vt (gate CD)',
  createdAt: '2026-08-20T09:15:00.000Z',
  pinnedAt: null,
  publishedAt: '2026-08-20T09:20:00.000Z',
  owner: 'user-1',
  ownerDisplay: 'You',
  isOwn: true,
  isShared: false,
  hasPersonalCopy: false,
} satisfies Artifact;

function renderDialogWithToggle() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageToggle />
      <ShareArtifactDialog open onClose={vi.fn()} artifact={artifact} />
    </QueryClientProvider>,
  );
}

/** The switch itself, not the wording it produces. The rest of the suite runs in Chinese
 *  (the default), asserting behaviour rather than language; these are the few cases that
 *  exist to prove the other language is reachable at all — and that the two dictionaries
 *  are not the same object wearing two names. */
describe('Switching the interface language', () => {
  afterEach(() => {
    useLanguageStore.setState({ language: 'zh-TW' });
  });

  it('repaints the copy in English, and back again', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/artifacts/:id/shares', () => HttpResponse.json([])));
    renderDialogWithToggle();

    expect(await screen.findByText(zhTW.share.subtitle)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Switch to English' }));

    expect(await screen.findByText(en.share.subtitle)).toBeInTheDocument();
    expect(screen.queryByText(zhTW.share.subtitle)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '切換為中文' }));

    expect(await screen.findByText(zhTW.share.subtitle)).toBeInTheDocument();
  });

  /** The glyph names the destination, matching the theme button beside it — which shows
   *  a sun while the app is dark. Showing the current language instead would read as a
   *  label and give no reason to press. */
  it('shows the language it switches to, not the one in use', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/artifacts/:id/shares', () => HttpResponse.json([])));
    renderDialogWithToggle();

    const toggle = screen.getByRole('button', { name: 'Switch to English' });
    expect(toggle).toHaveTextContent('EN');

    await user.click(toggle);

    expect(screen.getByRole('button', { name: '切換為中文' })).toHaveTextContent('中');
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
      .filter(
        ([key, value]) =>
          typeof value === 'string' && value === (en.share as Record<string, unknown>)[key],
      )
      // `Submit` is the same word in both — a label the product uses as-is, not a gap.
      .filter(([key]) => key !== 'submit');

    expect(untranslated).toEqual([]);
  });
});
