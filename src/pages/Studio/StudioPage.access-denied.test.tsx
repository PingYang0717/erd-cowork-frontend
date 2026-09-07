import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';

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
