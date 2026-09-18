import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { en } from '@/i18n/en';
import { server } from '@/mocks/server';
import { useRepairOfferStore } from '@/stores/useRepairOfferStore';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { mockAgentStream } from '@/test/agentStream';
import { renderStudio, waitForComposer } from '@/test/renderStudio';
import { answerAnalysisConditions } from '@/test/studioRun';

const runAnalysis = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: 'New chat' }));
  await screen.findByRole('button', { name: 'New analysis' });
  await waitForComposer();
  await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
  await answerAnalysisConditions(user);
  return (await screen.findByTitle('Artifact preview')) as HTMLIFrameElement;
};

/** jsdom does not run scripts inside an iframe's srcdoc, so the collector the artifact
 *  ships cannot fire on its own. This is the message it would post. */
const reportRuntimeError = (iframe: HTMLIFrameElement, message: string) => {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'erd-artifact-error', errors: [{ message, line: 42, col: 7 }] },
        source: iframe.contentWindow,
      })
    );
  });
};

describe('Artifact repair', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    useRepairOfferStore.setState(useRepairOfferStore.getInitialState());
  });

  it('ships an error collector inside every artifact', async () => {
    const user = userEvent.setup();
    renderStudio();

    const iframe = await runAnalysis(user);

    const srcdoc = iframe.getAttribute('srcdoc') ?? '';
    expect(srcdoc).toContain('erd-artifact-error');
    expect(srcdoc).toContain('unhandledrejection');
  });

  it('offers to repair an artifact that threw, and reloads it once repaired', async () => {
    const user = userEvent.setup();
    renderStudio();

    const iframe = await runAnalysis(user);
    expect(screen.queryByText(/runtime error/)).not.toBeInTheDocument();

    reportRuntimeError(iframe, "Cannot read properties of undefined (reading 'series')");

    expect(await screen.findByText(en.repair.detected(1))).toBeInTheDocument();
    expect(screen.getByText("Cannot read properties of undefined (reading 'series')")).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Repair' }));

    // The offer clears once the repair lands, and the artifact is served again.
    await screen.findByTitle('Artifact preview');
    expect(screen.queryByText(/runtime error/)).not.toBeInTheDocument();
  });

  it('stops offering once the user has dismissed it for that artifact', async () => {
    const user = userEvent.setup();
    renderStudio();

    const iframe = await runAnalysis(user);

    reportRuntimeError(iframe, 'boom');
    await screen.findByText(en.repair.detected(1));

    await user.click(screen.getByRole('button', { name: 'Ignore' }));
    expect(screen.queryByText(/runtime error/)).not.toBeInTheDocument();

    reportRuntimeError(iframe, 'boom again');
    expect(screen.queryByText(/runtime error/)).not.toBeInTheDocument();
  });

  it('says so when a repair produced nothing, and lets the user try again', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    server.use(
      http.post('/api/artifacts/:id/repair', () => {
        attempts += 1;
        return HttpResponse.json({ repaired: false });
      })
    );
    renderStudio();

    const iframe = await runAnalysis(user);
    reportRuntimeError(iframe, 'boom');
    await screen.findByText(en.repair.detected(1));

    await user.click(screen.getByRole('button', { name: 'Repair' }));

    expect(await screen.findByText('Repair did not succeed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Repair' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(attempts).toBe(2));
  });

  // Retrying is pointless when the data the artifact was built from has been deleted;
  // the only move left is to re-upload, which is the retention notice's job to say.
  it('stops offering a retry when the backend says the files are gone', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/artifacts/:id/repair', () =>
        HttpResponse.json({ code: 'FILES_EXPIRED', message: '檔案已過期' }, { status: 409 })
      )
    );
    renderStudio();

    const iframe = await runAnalysis(user);
    reportRuntimeError(iframe, 'boom');
    await screen.findByText(en.repair.detected(1));

    await user.click(screen.getByRole('button', { name: 'Repair' }));

    expect(await screen.findByText(en.repair.filesExpired)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  /** ADR-0015 §run-in-progress-wins. The artifact on the pane throws while the agent is
   *  still answering — the run is producing its replacement, or has not finished writing
   *  it. No offer appears in the thread, then or after the run ends. */
  it('does not offer a repair for an error raised while the agent is answering', async () => {
    const user = userEvent.setup();
    renderStudio();

    const iframe = await runAnalysis(user);

    // A follow-up, on a stream the test holds open.
    const stream = mockAgentStream();
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Narrow it to lot 7');
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    await screen.findByRole('button', { name: 'Stop' });

    reportRuntimeError(iframe, "Cannot read properties of undefined (reading 'series')");
    expect(screen.queryByText(en.repair.detected(1))).not.toBeInTheDocument();

    act(() => stream.push({ type: 'TOKEN', delta: 'Narrowed.' }));
    act(() => stream.close());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument());

    // Not queued for later either.
    expect(screen.queryByText(en.repair.detected(1))).not.toBeInTheDocument();
    expect(useRepairOfferStore.getState().queue).toHaveLength(0);
  });

  it('drops the offer when the user moves to another session', async () => {
    const user = userEvent.setup();
    renderStudio();

    const iframe = await runAnalysis(user);
    reportRuntimeError(iframe, 'boom');
    await screen.findByText(en.repair.detected(1));

    await user.click(await screen.findByRole('button', { name: 'New chat' }));

    await waitFor(() => expect(screen.queryByText(/runtime error/)).not.toBeInTheDocument());
  });
});
