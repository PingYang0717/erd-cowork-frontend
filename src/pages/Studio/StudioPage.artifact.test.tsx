import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionSelectionStore } from '@/features/session/store/useSessionSelectionStore';
import { StudioShell } from '@/features/studio/components/StudioShell';
import { useStudioLayoutStore } from '@/features/studio/store/useStudioLayoutStore';
import { useThemeStore } from '@/features/theme/store/useThemeStore';

import { StudioPage } from './StudioPage';

// StudioPage is only the /cowork index route's content now; the session
// rail lives in StudioShell, the route's shared parent (router.tsx). This
// mirrors that nesting so the rendered tree matches production.
function renderStudioPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/cowork']}>
        <Routes>
          <Route path="/cowork" element={<StudioShell />}>
            <Route index element={<StudioPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// A plain vi.advanceTimersByTimeAsync(0) only flushes timers already queued
// at call time; React Query's cross-component cache notifications add their
// own setTimeout(0) hop once a query's data changes, so catching that
// requires draining timers repeatedly rather than a single fixed-width step.
async function flushAllTimers() {
  await act(async () => {
    await vi.runAllTimersAsync();
  });
}

async function selectASessionAndRunSpcScenario() {
  fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
  await flushAllTimers();

  fireEvent.click(screen.getByRole('button', { name: 'SPC analysis' }));
  await flushAllTimers();
}

describe('Artifact panel', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    useThemeStore.setState(useThemeStore.getInitialState());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the produced Artifact HTML in a sandboxed iframe once a scenario completes', async () => {
    renderStudioPage();
    await selectASessionAndRunSpcScenario();

    const iframe = screen.getByTitle('Artifact preview') as HTMLIFrameElement;
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
    expect(iframe.getAttribute('srcdoc')).toContain('SPC analysis — Vt (gate CD)');
    expect(iframe.getAttribute('srcdoc')).toContain('data-artifact-theme="light"');
  });

  it('re-renders the iframe with the dark variant when the app theme is toggled', async () => {
    renderStudioPage();
    await selectASessionAndRunSpcScenario();

    screen.getByTitle('Artifact preview');

    await act(async () => {
      useThemeStore.getState().toggleTheme();
    });
    await flushAllTimers();

    const iframe = screen.getByTitle('Artifact preview') as HTMLIFrameElement;
    expect(iframe.getAttribute('srcdoc')).toContain('data-artifact-theme="dark"');
  });
});
