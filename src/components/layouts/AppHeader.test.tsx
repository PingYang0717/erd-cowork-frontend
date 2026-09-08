import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { en } from '@/i18n/en';
import { server } from '@/mocks/server';
import { appWrapper } from '@/test/appHarness';
import AppHeader from './AppHeader';

const EMPLOYEE = {
  type: 'EMPLOYEE',
  employeeName: '鄭凱宇',
  employeeNt: 'CHXXGHYC',
  employeeOrgName: 'INTD-1',
  emplId: 'E12345',
};

const renderHeader = () =>
  render(
    <MemoryRouter>
      <AppHeader />
    </MemoryRouter>,
    { wrapper: appWrapper() }
  );

describe('AppHeader', () => {
  /** Every right this app grants is tied to who is signed in — another person's session
   *  is a 404, not a permission error. A menu of two preference switches gives the reader
   *  no way to confirm the account those rights are being decided for. */
  it('opens the account menu on the avatar, and says who is signed in', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/hr/userInfo', () => HttpResponse.json(EMPLOYEE)));
    renderHeader();

    await user.click(await screen.findByRole('button', { name: 'Account' }));

    expect(await screen.findByText('鄭凱宇')).toBeInTheDocument();
    expect(screen.getByText('INTD-1')).toBeInTheDocument();
  });

  /** The keyboard contract this repo adopted for every menu and dialog (ADR-0014
   *  §menu-keyboard/§dialog-focus): Escape closes it, and the focus goes back where it
   *  came from. Dropped focus in a three-pane layout means losing your place entirely. */
  it('closes on Escape and gives the focus back to the avatar', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/hr/userInfo', () => HttpResponse.json(EMPLOYEE)));
    renderHeader();

    const avatar = await screen.findByRole('button', { name: 'Account' });
    await user.click(avatar);
    await screen.findByText('鄭凱宇');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByText('鄭凱宇')).not.toBeInTheDocument());
    expect(avatar).toHaveFocus();
  });

  /** The load-bearing one. The failure card below this header no longer carries its own
   *  settings entry, and that is only safe because the header cannot fail: a reader who
   *  cannot read the interface is exactly the one who needs the language switch, and they
   *  must not lose it because a request about a decoration did not answer. */
  it('still offers the preferences when nobody could be identified', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/hr/userInfo', () => new HttpResponse(null, { status: 500 })));
    renderHeader();

    await user.click(await screen.findByRole('button', { name: 'Account' }));

    expect(await screen.findByRole('radio', { name: en.settings.themeDark })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: en.settings.languageEn })).toBeInTheDocument();
  });

  /** A name but no picture — the employee has no id to build an address from. The initial
   *  is what the reader recognises themselves by, and it keeps the circle the same size
   *  whichever of the three no-picture cases this is. */
  it('falls back to the first character of the name when there is no picture', async () => {
    server.use(http.get('/api/hr/userInfo', () => HttpResponse.json({ ...EMPLOYEE, emplId: undefined })));
    renderHeader();

    const avatar = await screen.findByRole('button', { name: 'Account' });
    await waitFor(() => expect(avatar).toHaveTextContent('鄭'));
    expect(avatar.querySelector('img')).toBeNull();
  });
});
