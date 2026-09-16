import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { en } from '@/i18n/en';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { renderStudio, waitForComposer } from '@/test/renderStudio';

const openPlusMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Attach files or connect a data source' }));
};

/** A conversation draws on one kind of data source — Connectors or uploaded files,
 *  never both (CONTEXT.md, 已選來源). The rule is met at the entry: the item for the
 *  other kind greys out and says why, rather than a send failing later. */
describe('One kind of data source per conversation', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
  });

  it('greys out attaching files on a conversation that draws on data sources', async () => {
    const user = userEvent.setup();
    renderStudio();
    // Seeded with Inline, WAT and CP attached.
    await user.click(await screen.findByRole('button', { name: 'Defect pareto — W12' }));
    await waitForComposer();

    await openPlusMenu(user);

    const attach = screen.getByRole('menuitem', { name: /^Attach files/ });
    expect(attach).toHaveAttribute('aria-disabled', 'true');
    expect(within(attach).getByText(en.composer.attachBlockedByConnectors)).toBeInTheDocument();
    // The other kind stays open.
    expect(screen.getByRole('menuitem', { name: /^Connectors/ })).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('greys out connecting data sources on a conversation that has a file attached', async () => {
    const user = userEvent.setup();
    renderStudio();
    // A fresh conversation has no sources, so files are the kind it takes on.
    await user.click(await screen.findByRole('button', { name: 'New chat' }));
    await waitForComposer();
    await openPlusMenu(user);
    await user.click(screen.getByRole('menuitem', { name: /^Attach files/ }));
    await screen.findByRole('dialog', { name: 'Attach files' });
    fireEvent.change(screen.getByLabelText('Choose files'), {
      target: { files: [new File([new Uint8Array(512)], 'lots.csv', { type: 'text/csv' })] },
    });
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Attached files' })).getByText('lots.csv')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Done' }));

    await openPlusMenu(user);

    const connectors = screen.getByRole('menuitem', { name: /^Connectors/ });
    expect(connectors).toHaveAttribute('aria-disabled', 'true');
    expect(within(connectors).getByText(en.composer.connectorsBlockedByFiles)).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /^Attach files/ })).not.toHaveAttribute('aria-disabled', 'true');
  });
});
