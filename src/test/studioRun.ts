import { screen, within } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';

type User = ReturnType<typeof userEvent.setup>;

const SUBMIT_LABEL = /^(送出|開始分析|先產生這 \d+ 項)$/;

const waitForForm = async (): Promise<HTMLElement | null> => {
  try {
    return await screen.findByRole('button', { name: SUBMIT_LABEL }, { timeout: 1500 });
  } catch {
    return null;
  }
};

const chip = (groupName: string, chipName: string | RegExp) => {
  return within(screen.getByRole('group', { name: groupName })).getByRole('button', {
    name: chipName,
  });
};

const answerOneForm = async (user: User, submit: HTMLElement): Promise<void> => {
  if (screen.queryByRole('group', { name: 'Part ID' })) {
    await user.click(chip('Part ID', 'A14'));
    await user.click(chip('Time range', 'Last 7 days'));
    await user.click(chip('Data type', 'Inline'));
  } else if (screen.queryByRole('group', { name: '你的角色' })) {
    await user.click(chip('你的角色', 'INT Baseline'));
    await user.click(chip('時間區間', '近 7 天'));
  } else if (screen.queryByRole('group', { name: 'DC item' })) {
    await user.click(chip('DC item', /Vt \(gate CD\)/));
  }

  // The submit label carries a live count, so re-read it rather than reusing the node.
  await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));
  void submit;
};

/** Answers every reask a run raises, in order, with a plausible set of conditions.
 *  SPC asks twice (conditions, then which DC items to chart first); Inline and CP Test
 *  ask once; Daily monitor does not ask at all, so this is a no-op there. */
export const answerAnalysisConditions = async (user: User): Promise<void> => {
  for (let round = 0; round < 3; round += 1) {
    const submit = await waitForForm();
    if (!submit) {
      return;
    }
    await answerOneForm(user, submit);
  }
};

/** Publishes the Artifact on display: presses 發布 Artifact, then names it in the dialog
 *  that asks. Publishing takes a title now — the Gallery reads a card by it, so it is
 *  written at that moment rather than inherited from the run. */
export const publishArtifactAs = async (user: User, title?: string): Promise<void> => {
  await user.click(await screen.findByRole('button', { name: 'Publish Artifact' }));
  const nameField = await screen.findByLabelText('Name');
  if (title !== undefined) {
    await user.clear(nameField);
    await user.type(nameField, title);
  }
  // The dialog's own confirm, not the panel button that opened it — that one reads
  // 發布 Artifact.
  await user.click(screen.getByRole('button', { name: /^Publish$/ }));
};
