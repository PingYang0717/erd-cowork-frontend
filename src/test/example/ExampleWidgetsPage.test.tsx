import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ExampleWidgetsPage } from './ExampleWidgetsPage';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ExampleWidgetsPage', () => {
  it('renders widgets returned by the mocked network boundary', async () => {
    renderWithProviders(<ExampleWidgetsPage />);

    const list = await screen.findByRole('list', { name: 'example widgets' });

    expect(within(list).getByText('Inline Dashboard')).toBeInTheDocument();
    expect(within(list).getByText('SPC Analysis')).toBeInTheDocument();
  });
});
