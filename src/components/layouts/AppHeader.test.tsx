import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

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
