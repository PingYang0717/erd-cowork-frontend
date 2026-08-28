import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import StudioShell from '@/components/layouts/StudioShell';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { mockAgentStream } from '@/test/agentStream';
import { answerAnalysisConditions } from '@/test/studioRun';

import StudioPage from './StudioPage';

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
  await user.click(await screen.findByRole('button', { name: 'New chat' }));
  await screen.findByRole('button', { name: 'New analysis' });
  // The composer subtree suspends on its queries; wait for it before sync getBy*.
  await screen.findByRole('textbox', { name: 'Message' });
}

/** Clicks a suggested prompt and waits for the whole scripted run to land in the thread.
 *  The mock backend streams the run and closes; there is no timer to advance. */
async function runScenario(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole('button', { name: label }));
  await answerAnalysisConditions(user);
  return screen.findByRole('button', { name: /^Worked through \d+ steps$/ });
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

  // A Chinese-input user is mid-composition on almost every Enter they press: the key
  // commits the candidate word, and only a second Enter means "send".
  it('commits the input-method candidate instead of sending while the user is composing', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudioPage();
    await selectASession(user);

    const textbox = screen.getByRole('textbox', { name: 'Message' });
    fireEvent.compositionStart(textbox);
    await user.type(textbox, 'ㄊㄨㄥ');
    fireEvent.keyDown(textbox, { key: 'Enter' });

    expect(stream.requests).toHaveLength(0);
    expect(textbox).toHaveValue('ㄊㄨㄥ');
  });

  it('sends once composition has ended and Enter is pressed again', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudioPage();
    await selectASession(user);

    const textbox = screen.getByRole('textbox', { name: 'Message' });
    fireEvent.compositionStart(textbox);
    await user.type(textbox, '統計製程管制');
    fireEvent.keyDown(textbox, { key: 'Enter' });
    fireEvent.compositionEnd(textbox);
    fireEvent.keyDown(textbox, { key: 'Enter' });

    await waitFor(() => expect(stream.requests).toHaveLength(1));
    expect(stream.requests[0]).toMatchObject({ question: '統計製程管制' });
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
    'leaves a reply referencing an artifact in the thread when clicking "$label"',
    async ({ label, replyMatch, artifactName }) => {
      const user = userEvent.setup();
      renderStudioPage();
      await selectASession(user);

      await runScenario(user, label);

      expect(screen.getByText(replyMatch)).toBeInTheDocument();
      const chip = screen.getByText('shown right →').closest('div') as HTMLElement;
      expect(within(chip).getByText(artifactName)).toBeInTheDocument();
      expect(screen.queryByRole('status', { name: 'eRD AI is working' })).not.toBeInTheDocument();
    },
  );

  it('keeps a collapsible recap of the run once it has finished', async () => {
    const user = userEvent.setup();
    renderStudioPage();
    await selectASession(user);

    const recap = await runScenario(user, 'SPC analysis');

    // Scan and filter are added by the DC item reask the SPC run raises mid-flight.
    expect(recap).toHaveAccessibleName('Worked through 5 steps');
    expect(recap).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Inline DB · Vt (gate CD)')).not.toBeInTheDocument();

    // Expanding shows every step's title and description.
    await user.click(recap);
    expect(screen.getByText('Connect data source')).toBeInTheDocument();
    expect(screen.getByText('Inline DB · Vt (gate CD)')).toBeInTheDocument();
    expect(screen.getByText('CL / ±3σ, apply Western Electric rules')).toBeInTheDocument();
  });

  it('auto-scrolls the thread to the bottom when a new message lands', async () => {
    const user = userEvent.setup();
    renderStudioPage();
    await selectASession(user);

    // The thread only exists once it has something in it: an empty session shows the
    // empty state instead, and there is nothing to scroll.
    await runScenario(user, 'SPC analysis');
    const log = screen.getByRole('log', { name: 'Messages' });
    Object.defineProperty(log, 'scrollHeight', { value: 640, configurable: true });
    log.scrollTop = 0;

    // The user's own words land in the thread the moment they send, which is exactly
    // the moment the thread has to follow them down.
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'And the Cpk?{Enter}');

    await waitFor(() => expect(log.scrollTop).toBe(640));
  });

  it('appends the slides step and names a slides Artifact when clicking "Generate slides"', async () => {
    const user = userEvent.setup();
    renderStudioPage();
    await selectASession(user);

    const recap = await runScenario(user, 'Generate slides');

    expect(recap).toHaveAccessibleName('Worked through 6 steps');
    await user.click(recap);
    expect(screen.getByText('Title, control chart, Cpk, findings')).toBeInTheDocument();

    const chip = screen.getByText('shown right →').closest('div') as HTMLElement;
    expect(within(chip).getByText('SPC analysis — Vt (gate CD) (slides)')).toBeInTheDocument();
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
    'matches free text "$text" to a scenario and replies with its artifact',
    async ({ text, replyMatch, artifactName }) => {
      const user = userEvent.setup();
      renderStudioPage();
      await selectASession(user);

      await user.type(screen.getByRole('textbox', { name: 'Message' }), text);
      await user.click(screen.getByRole('button', { name: 'Send message' }));
      await answerAnalysisConditions(user);

      await screen.findByRole('button', { name: /^Worked through \d+ steps$/ });

      expect(screen.getByText(text)).toBeInTheDocument();
      expect(screen.getByText(replyMatch)).toBeInTheDocument();
      const chip = screen.getByText('shown right →').closest('div') as HTMLElement;
      expect(within(chip).getByText(artifactName)).toBeInTheDocument();
      expect(screen.queryByRole('status', { name: 'eRD AI is working' })).not.toBeInTheDocument();
    },
  );
});
