import { expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
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

/** A field is offered either as a row of chips or as a dropdown, depending on how many
 *  options it has and how long they read (`QuestionFormCard.rendersAsDropdown`). Tests
 *  answer the question, not the widget: this finds whichever control is there, so moving
 *  a field across that threshold does not rewrite every suite that runs a scenario. */
const hasField = (label: string): boolean =>
  screen.queryByRole('group', { name: label }) !== null || screen.queryByRole('combobox', { name: label }) !== null;

const matches = (text: string, option: string | RegExp) =>
  typeof option === 'string' ? text === option : option.test(text);

/** Answers one field, whichever control it is offered as — chips or a dropdown
 *  (`QuestionFormCard.rendersAsDropdown`). Exported so suites that drive a form directly
 *  do not each re-derive which shape a field happens to be in. */
export const answerField = async (user: User, label: string, option: string | RegExp): Promise<void> => {
  const dropdown = screen.queryByRole('combobox', { name: label });
  if (dropdown) {
    await user.click(dropdown);
    // Scoped to the option rows rather than looked up by title across the document: the
    // open list is portalled outside the card, and a title match there also hits the
    // chosen-value element and any row whose label merely contains the same words.
    const row = await waitFor(() => {
      const rows = Array.from(document.querySelectorAll<HTMLElement>('.ant-select-item-option')).filter((node) =>
        matches(node.textContent ?? '', option)
      );
      expect(rows.length).toBeGreaterThan(0);
      return rows[0];
    });
    await user.click(row);
    return;
  }
  await user.click(within(screen.getByRole('group', { name: label })).getByRole('button', { name: option }));
};

const answerOneForm = async (user: User, submit: HTMLElement): Promise<void> => {
  if (hasField('Part ID')) {
    await answerField(user, 'Part ID', 'A14');
    await answerField(user, 'Time range', 'Last 7 days');
    await answerField(user, 'Data type', 'Inline');
  } else if (hasField('你的角色')) {
    await answerField(user, '你的角色', 'INT Baseline');
    await answerField(user, '時間區間', '近 7 天');
  } else if (hasField('DC item')) {
    await answerField(user, 'DC item', /Vt \(gate CD\)/);
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
