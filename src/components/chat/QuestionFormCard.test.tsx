import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { appWrapper } from '@/test/appHarness';
import type { QuestionField, QuestionForm } from '@/types/api';
import QuestionFormCard from './QuestionFormCard';

const formOf = (...fields: QuestionField[]): QuestionForm => ({
  formKey: 'test',
  title: 'Analysis conditions',
  fields,
  submitLabel: 'Send',
  disabledHint: 'Answer the questions above first',
  summaryLabel: 'Analysis conditions',
});

const field = (over: Partial<QuestionField> & { key: string; label: string }): QuestionField => ({
  kind: 'single',
  required: true,
  ...over,
});

const options = (...values: string[]) => values.map((value) => ({ value, label: value }));

const renderCard = (form: QuestionForm, onSubmit = vi.fn()) => {
  render(<QuestionFormCard form={form} onSubmit={onSubmit} />, { wrapper: appWrapper() });
  return { onSubmit };
};

/** Chips are the right shape for a handful of short answers: every choice is visible at a
 *  glance and one click away. They stop being the right shape when the row grows past two
 *  lines — which happens either because there are too many of them, or because the labels
 *  are long. A dropdown carries both cases without the card taking over the thread. */
describe('QuestionFormCard: how a field is offered', () => {
  it('keeps chips for a handful of short options', async () => {
    renderCard(formOf(field({ key: 'part', label: 'Part ID', options: options('A14', 'A16', 'A18') })));

    const group = screen.getByRole('group', { name: 'Part ID' });
    expect(within(group).getByRole('button', { name: 'A14' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('switches to a dropdown once there are more than five options', async () => {
    renderCard(
      formOf(field({ key: 'part', label: 'Part ID', options: options('A14', 'A16', 'A18', 'A20', 'A22', 'A24') }))
    );

    expect(screen.getByRole('combobox', { name: 'Part ID' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Part ID' })).not.toBeInTheDocument();
  });

  /** Three options still, but one of them reads as a phrase — the row would wrap well past
   *  two lines on a narrow thread pane. */
  it('switches to a dropdown when an option is too long to sit on a chip', async () => {
    renderCard(
      formOf(
        field({
          key: 'range',
          label: 'Time range',
          options: options('Today', 'Last 7 days', 'Since the last maintenance window'),
        })
      )
    );

    expect(screen.getByRole('combobox', { name: 'Time range' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Time range' })).not.toBeInTheDocument();
  });

  /** A one-switch field is its own control: the chip IS the value, and there is nothing
   *  to pick between. However long the wording, a dropdown would be a worse shape. */
  it('leaves a boolean field as its single chip however long the wording', async () => {
    renderCard(
      formOf(
        field({
          key: 'compare',
          label: 'Compare',
          kind: 'boolean',
          options: options('Compare against the previous quarter'),
        })
      )
    );

    expect(screen.getByRole('group', { name: 'Compare' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('answers a single-choice dropdown, and submits what was picked', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderCard(
      formOf(
        field({
          key: 'range',
          label: 'Time range',
          options: options('Today', 'Last 7 days', 'Since the last maintenance window'),
        })
      )
    );

    await user.click(screen.getByRole('combobox', { name: 'Time range' }));
    await user.click(await screen.findByTitle('Last 7 days'));
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSubmit).toHaveBeenCalledWith({ range: 'Last 7 days' });
  });

  /** Narrowing a long list is the dropdown's own job. The card used to put a search box
   *  above the chips for the same reason, but a field long enough to need one is now
   *  offered as a dropdown — which searches without a second input to maintain. */
  it('narrows a long option list by typing into the dropdown', async () => {
    const user = userEvent.setup();
    renderCard(
      formOf(
        field({
          key: 'part',
          label: 'Part ID',
          kind: 'multi',
          options: options('A14', 'A14-B', 'A16', 'N5', 'N5-P', 'N3', 'N3-X', 'P22'),
        })
      )
    );

    const dropdown = screen.getByRole('combobox', { name: 'Part ID' });
    await user.click(dropdown);
    expect(await screen.findByTitle('N5')).toBeInTheDocument();

    await user.type(dropdown, 'A14');

    expect(await screen.findByTitle('A14-B')).toBeInTheDocument();
    expect(screen.queryByTitle('N5')).not.toBeInTheDocument();
  });

  /** `multi` is the flag that says more than one answer is allowed, so the dropdown it
   *  becomes has to keep taking them rather than replacing the last. */
  it('keeps taking answers when the field allows more than one', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderCard(
      formOf(
        field({
          key: 'sources',
          label: 'Data type',
          kind: 'multi',
          options: options('Inline', 'WAT', 'CP', 'Defect', 'Recipe', 'Process'),
        })
      )
    );

    await user.click(screen.getByRole('combobox', { name: 'Data type' }));
    await user.click(await screen.findByTitle('Inline'));
    await user.click(await screen.findByTitle('WAT'));
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSubmit).toHaveBeenCalledWith({ sources: ['Inline', 'WAT'] });
  });
});
