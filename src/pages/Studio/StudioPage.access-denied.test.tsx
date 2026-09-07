import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { en } from '@/i18n/en';
import { server } from '@/mocks/server';
import { useAccessDeniedStore } from '@/stores/useAccessDeniedStore';
import { renderStudio } from '@/test/renderStudio';

/** A refused account is not a failed pane. Every other request will be refused for the
 *  same reason, so the app stops rather than letting the user keep pressing things that
 *  cannot work — and it shows the backend's own sentence, which is the only thing that
 *  says whether the fix is asking for access or applying for an entitlement. */
describe('Studio when the account is refused', () => {
  beforeEach(() => useAccessDeniedStore.getState().clear());

  it("covers the app with the backend's own explanation", async () => {
    server.use(
      http.get('/api/sessions', () =>
        HttpResponse.json(
          { code: 'ENTITLEMENT_DENIED', message: '此帳號缺少 A4 entitlement,請先至 A4 申請。' },
          { status: 403 }
        )
      )
    );
    renderStudio({ retry: false });

    const denial = await screen.findByRole('alert', { name: 'Access denied' });
    expect(denial).toHaveTextContent('此帳號缺少 A4 entitlement,請先至 A4 申請。');
  });

  /** The gate reports the refusal at full strength, with the backend's own explanation.
   *  A toast underneath it is a second, worse telling of the same thing — and one nobody
   *  can read, because the overlay covers it. Worse, a 403 whose code is not one this app
   *  recognises fell through to the status wording, so the queued toast read "That did not
   *  go through (the server answered 403)". */
  it('does not also queue a toast nobody can read', async () => {
    const user = userEvent.setup();
    server.use(
      http.patch('/api/sessions/:id/pin', () =>
        HttpResponse.json({ code: 'ACCESS_DENIED', message: 'No rights on this session' }, { status: 403 })
      )
    );
    renderStudio();

    await screen.findByRole('button', { name: 'Defect pareto — W12' });
    await user.click(screen.getByRole('button', { name: 'More actions for Defect pareto — W12' }));
    await user.click(await screen.findByRole('menuitem', { name: /Pin/ }));

    await screen.findByRole('alert', { name: 'Access denied' });

    expect(screen.queryByText(en.errors.actionFailedWithStatus(403))).not.toBeInTheDocument();
  });

  /** Nothing dismisses it: closing would return the user to a screen whose every request
   *  is refused, which only defers the same message. A reload is the honest way back —
   *  it asks the backend again, so an entitlement granted in the meantime takes effect. */
  it('offers no way to dismiss it', async () => {
    server.use(http.get('/api/sessions', () => HttpResponse.json({ code: 'ACCESS_DENIED' }, { status: 403 })));
    renderStudio({ retry: false });

    await screen.findByRole('alert', { name: 'Access denied' });

    expect(screen.queryByRole('button', { name: /close|dismiss|cancel/i })).not.toBeInTheDocument();
  });
});
