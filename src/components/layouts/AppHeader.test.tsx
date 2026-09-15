// @vitest-environment-options {"url":"http://localhost:5199/"}
// The header only dresses up on a listed host (utils/festival.ts). This file runs at the
// dev server's host so the calendar-driven cases below are about the calendar; the host
// gate itself has its own file.
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { FESTIVAL_PREVIEW_STORAGE_KEY } from '@/constants/storage';
import { CURRENT_EMPLOYEE } from '@/mocks/handlers.directory';
import { server } from '@/mocks/server';
import { appWrapper } from '@/test/appHarness';
import AppHeader from './AppHeader';

const renderHeader = () => render(<AppHeader />, { wrapper: appWrapper({ retry: false }) });

const avatarButton = () => screen.getByRole('button', { name: 'Preferences' });

/** The avatar is whoever is signed in, as `GET /hr/userInfo` describes them — asked once
 *  when the app starts, and drawn the way the share picker draws a recipient. */
describe('AppHeader avatar', () => {
  it('shows the signed-in user’s photo, keyed on their employee id', async () => {
    renderHeader();

    await waitFor(() =>
      expect(avatarButton().querySelector('img')?.getAttribute('src')).toMatch(
        new RegExp(`/${CURRENT_EMPLOYEE.emplId}\\.jpg$`)
      )
    );
  });

  /** The photo host answers for most employees and not for some; the only way to learn
   *  which is to ask for the image. When it fails, the initial stands in — the same
   *  fallback a recipient gets. */
  it('falls back to the user’s initial when the photo cannot be fetched', async () => {
    renderHeader();

    const photo = await waitFor(() => {
      const img = avatarButton().querySelector('img');
      expect(img).not.toBeNull();
      return img as HTMLImageElement;
    });
    fireEvent.error(photo);

    expect(avatarButton()).toHaveTextContent((CURRENT_EMPLOYEE.sortName as string).slice(0, 1));
    expect(avatarButton().querySelector('img')).toBeNull();
  });

  /** A profile that never answers must not take the header with it: the header is where
   *  the language exit lives. A generic figure stands in, and the panel still opens. */
  it('keeps a generic figure, and a working panel, when the profile cannot be read', async () => {
    server.use(http.get('/api/hr/userInfo', () => new HttpResponse(null, { status: 500 })));
    renderHeader();

    // The request has to have failed, not merely not arrived yet: the generic figure is
    // also what shows while it is in flight.
    await waitFor(() => expect(avatarButton().querySelector('.anticon-user')).not.toBeNull(), { timeout: 3000 });
    expect(avatarButton().querySelector('img')).toBeNull();
    expect(avatarButton()).toHaveTextContent('');
  });
});

/** The festive layer, forced on through the preview key the way someone checking it
 *  outside the dates would. Decoration only: hidden from readers, and the avatar button
 *  keeps its name and its panel. */
describe('AppHeader festive decoration', () => {
  const stage = () => document.querySelector('[data-festival]:not(button)');

  afterEach(() => vi.useRealTimers());

  /** Pinned to a date, not left to the clock: the suite would otherwise fail for two
   *  weeks every autumn, which is the decoration working. */
  it('shows nothing on an ordinary day', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 3));
    renderHeader();
    expect(stage()).toBeNull();
  });

  it('puts the Christmas scene in the middle and a hat on the avatar', async () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'christmas');
    renderHeader();

    expect(stage()).toHaveAttribute('data-festival', 'christmas');
    expect(stage()).toHaveAttribute('aria-hidden', 'true');
    expect(avatarButton().querySelector('svg')).not.toBeNull();
    // Still the person underneath the hat.
    await waitFor(() => expect(avatarButton().querySelector('img')).not.toBeNull());
  });

  it('puts the avatar inside a pumpkin’s mouth at Halloween', async () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'halloween');
    renderHeader();

    expect(stage()).toHaveAttribute('data-festival', 'halloween');
    expect(avatarButton()).toHaveAttribute('data-festival', 'halloween');
    // Two layers around the face, and the face itself still there between them.
    expect(avatarButton().querySelectorAll(':scope > svg')).toHaveLength(2);
    await waitFor(() => expect(avatarButton().querySelector('img')).not.toBeNull());
    expect(avatarButton()).toHaveAccessibleName('Preferences');
  });

  it('leaves the avatar alone at Mid-Autumn', () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'midAutumn');
    renderHeader();

    expect(stage()).toHaveAttribute('data-festival', 'midAutumn');
    expect(avatarButton()).not.toHaveAttribute('data-festival');
  });
});
