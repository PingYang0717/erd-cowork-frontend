import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionSelectionStore } from '@/features/session/store/useSessionSelectionStore';
import { StudioShell } from '@/features/studio/components/StudioShell';
import { useStudioLayoutStore } from '@/features/studio/store/useStudioLayoutStore';

import { StudioPage } from './StudioPage';

const SUGGESTED_PROMPTS = [
  'Inline dashboard',
  'SPC analysis',
  'Generate slides',
  'Daily monitor (A14)',
  'CP Test status',
];

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

async function selectASession(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'New chat' }));
  await screen.findByRole('button', { name: 'New analysis' });
}

async function advanceTimers(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function selectASessionWithFakeTimers() {
  fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
  await advanceTimers(0);
}

describe('Chat composer', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
  });

  it('shows a message composer with the five suggested-prompt buttons once a session is selected', async () => {
    const user = userEvent.setup();
    renderStudioPage();
    await selectASession(user);

    expect(screen.getByRole('textbox', { name: 'Message' })).toBeInTheDocument();
    for (const label of SUGGESTED_PROMPTS) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('shows no composer before any session is selected', () => {
    renderStudioPage();

    expect(screen.queryByRole('textbox', { name: 'Message' })).not.toBeInTheDocument();
  });

  it('shows the data-source chip alongside the theme toggle in the thread header', () => {
    renderStudioPage();

    const header = screen.getByRole('banner', { name: 'Thread header' });
    expect(within(header).getByText('Inline DB · N5 line')).toBeInTheDocument();
    expect(
      within(header).getByRole('button', { name: /Switch to (dark|light) mode/ }),
    ).toBeInTheDocument();
  });
});

describe('Scenario matching', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    {
      label: 'SPC analysis',
      replyMatch: /Done — recomputed control limits/,
      artifactName: 'SPC analysis — Vt (gate CD)',
    },
    {
      label: 'Inline dashboard',
      replyMatch: /First version of the Inline dashboard is ready/,
      artifactName: 'Inline dashboard',
    },
    {
      label: 'Daily monitor (A14)',
      replyMatch: /Daily Monitor Dashboard — A14 generated/,
      artifactName: 'Daily Monitor Dashboard — A14',
    },
    {
      label: 'CP Test status',
      replyMatch: /CP Test status dashboard is ready/,
      artifactName: 'CP Test status',
    },
  ])(
    'plays the step animation and shows a final reply referencing an artifact when clicking "$label"',
    async ({ label, replyMatch, artifactName }) => {
      renderStudioPage();
      await selectASessionWithFakeTimers();

      fireEvent.click(screen.getByRole('button', { name: label }));
      await advanceTimers(0);

      expect(screen.getByRole('status', { name: 'eRD AI is working' })).toBeInTheDocument();
      expect(screen.queryByText(replyMatch)).not.toBeInTheDocument();

      await advanceTimers(500 * 4);

      expect(screen.getByText(replyMatch)).toBeInTheDocument();
      expect(screen.getByText(`Artifact: ${artifactName}`)).toBeInTheDocument();
      expect(screen.queryByRole('status', { name: 'eRD AI is working' })).not.toBeInTheDocument();
    },
  );

  it('labels the run "eRD AI is working…", renders step descriptions in a card, and keeps a collapsible recap after completion', async () => {
    renderStudioPage();
    await selectASessionWithFakeTimers();

    fireEvent.click(screen.getByRole('button', { name: 'SPC analysis' }));
    await advanceTimers(0);

    // While running: the working label and each step's description render.
    expect(screen.getByText('eRD AI is working…')).toBeInTheDocument();
    expect(screen.getByText('Inline DB · Vt (gate CD)')).toBeInTheDocument();

    await advanceTimers(500 * 4);

    // Completed: a collapsed "Worked through N steps" recap remains.
    const recap = screen.getByRole('button', { name: 'Worked through 3 steps' });
    expect(recap).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Inline DB · Vt (gate CD)')).not.toBeInTheDocument();

    // Expanding shows every step's title and description.
    fireEvent.click(recap);
    expect(screen.getByText('Connect data source')).toBeInTheDocument();
    expect(screen.getByText('Inline DB · Vt (gate CD)')).toBeInTheDocument();
    expect(screen.getByText('CL / ±3σ, apply Western Electric rules')).toBeInTheDocument();
  });

  it('appends the slides step and names a slides Artifact when clicking "Generate slides"', async () => {
    renderStudioPage();
    await selectASessionWithFakeTimers();

    fireEvent.click(screen.getByRole('button', { name: 'Generate slides' }));
    await advanceTimers(0);

    const working = screen.getByRole('status', { name: 'eRD AI is working' });
    expect(within(working).getByText('Generate slides')).toBeInTheDocument();

    await advanceTimers(500 * 5);

    expect(screen.getByText('Artifact: SPC analysis — Vt (gate CD) (slides)')).toBeInTheDocument();
  });

  it.each([
    {
      text: 'Can you build an inline dashboard for me?',
      replyMatch: /First version of the Inline dashboard is ready/,
      artifactName: 'Inline dashboard',
    },
    {
      text: 'Give me the daily monitor for A14',
      replyMatch: /Daily Monitor Dashboard — A14 generated/,
      artifactName: 'Daily Monitor Dashboard — A14',
    },
    {
      text: "What's the CP Test status right now?",
      replyMatch: /CP Test status dashboard is ready/,
      artifactName: 'CP Test status',
    },
    {
      text: 'Run an SPC analysis on Vt please',
      replyMatch: /Done — recomputed control limits/,
      artifactName: 'SPC analysis — Vt (gate CD)',
    },
  ])(
    'matches free text "$text" to a scenario and plays the reply',
    async ({ text, replyMatch, artifactName }) => {
      renderStudioPage();
      await selectASessionWithFakeTimers();

      fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), {
        target: { value: text },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
      await advanceTimers(0);

      expect(screen.getByText(text)).toBeInTheDocument();
      expect(screen.getByRole('status', { name: 'eRD AI is working' })).toBeInTheDocument();

      await advanceTimers(500 * 4);

      expect(screen.getByText(replyMatch)).toBeInTheDocument();
      expect(screen.getByText(`Artifact: ${artifactName}`)).toBeInTheDocument();
      expect(screen.queryByRole('status', { name: 'eRD AI is working' })).not.toBeInTheDocument();
    },
  );
});
