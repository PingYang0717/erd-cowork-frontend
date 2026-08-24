import { screen, within } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';

type User = ReturnType<typeof userEvent.setup>;

/** Fills in whichever opening reask the Scenario asked for and submits it.
 *  SPC / Inline / CP Test all ask before they run (ADR-0006); Daily monitor does not,
 *  so this is a no-op when no form is on screen. */
export async function answerAnalysisConditions(user: User): Promise<void> {
  const submit = screen.queryByRole('button', { name: '送出' });

  if (submit) {
    await user.click(
      within(screen.getByRole('group', { name: 'Part ID' })).getByRole('button', { name: 'A14' }),
    );
    await user.click(
      within(screen.getByRole('group', { name: 'Time range' })).getByRole('button', {
        name: 'Last 7 days',
      }),
    );
    await user.click(
      within(screen.getByRole('group', { name: 'Data type' })).getByRole('button', {
        name: 'Inline',
      }),
    );
    await user.click(submit);
    return;
  }

  const start = screen.queryByRole('button', { name: '開始分析' });
  if (start) {
    await user.click(
      within(screen.getByRole('group', { name: '你的角色' })).getByRole('button', {
        name: 'INT Baseline',
      }),
    );
    await user.click(
      within(screen.getByRole('group', { name: '時間區間' })).getByRole('button', {
        name: '近 7 天',
      }),
    );
    await user.click(start);
  }
}
