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

  /** A read-only card is drawn before the answers it shows are available: they are
   *  recovered from the reply, and the reply arrives with the history refetch after the
   *  card is already on screen. Held in `useState` — which reads its argument once, on
   *  mount — the card kept the empty object it started with and only filled in when
   *  something remounted it, which in practice meant reloading the page. */
  it('shows answers that arrive after it was drawn', () => {
    const form = formOf(field({ key: 'part', label: 'Part ID', options: options('A14', 'A16') }));

    const view = render(<QuestionFormCard form={form} disabled onSubmit={vi.fn()} />, { wrapper: appWrapper() });
    const group = screen.getByRole('group', { name: 'Part ID' });
    expect(within(group).getByRole('button', { name: 'A14' })).toHaveAttribute('aria-pressed', 'false');

    // Same instance, no remount — exactly what the refetch does to a card on screen.
    view.rerender(<QuestionFormCard form={form} disabled answered={{ part: 'A14' }} onSubmit={vi.fn()} />);

    expect(within(group).getByRole('button', { name: 'A14' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: 'A16' })).toHaveAttribute('aria-pressed', 'false');
  });

  /** A settled card is a statement, not a control, and the surrounding `<fieldset
   *  disabled>` does not make it one: antd draws its own wrapper around the input and
   *  opens the list from there, and it draws a tag's remove `×` as a span — neither is a
   *  form control, so neither is what the fieldset reaches. The list came down on a
   *  question answered long ago, offering choices that could not be made, and every
   *  chosen value wore a button that looked like it took the answer back.
   *
   *  Asserted on the `×` rather than on the list: jsdom will not deliver the click that
   *  opens it either way, so a test written against opening passes with or without the
   *  fix. The remove control is the same absence, and it is one jsdom can see. */
  it('offers no way to take back an answer on a settled card', async () => {
    const form = formOf(
      field({ key: 'lots', label: 'Lot', kind: 'multi', options: options('L1', 'L2', 'L3', 'L4', 'L5', 'L6') })
    );
    render(<QuestionFormCard form={form} disabled answered={{ lots: ['L1'] }} onSubmit={vi.fn()} />, {
      wrapper: appWrapper(),
    });

    expect(screen.getByTitle('L1')).toBeInTheDocument();
    expect(document.querySelector('.ant-select-selection-item-remove')).toBeNull();
  });

  /** The reader has to be able to answer what they were asked. A question the backend sent
   *  with no options used to lift into a choice with nothing to choose: an empty row, no
   *  input, and a Submit disabled for good. */
  it('lets an open question be answered and sent', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderCard(formOf(field({ key: 'range', label: 'Time range', kind: 'text' })));

    await user.type(screen.getByRole('textbox', { name: 'Time range' }), '07/01-07/31');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSubmit).toHaveBeenCalledWith({ range: '07/01-07/31' });
  });

  /** The box beside a list adds to the answer; it does not stand in for it. Writing the
   *  typed string over the answer — which is what a plain text field does — threw away
   *  every option the reader had already picked. */
  it('keeps the options already picked when a custom value is typed beside them', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderCard(
      formOf(field({ key: 'lots', label: 'Lot', kind: 'multi', allowCustom: true, options: options('A14', 'N5') }))
    );

    const group = screen.getByRole('group', { name: 'Lot' });
    await user.click(within(group).getByRole('button', { name: 'A14' }));
    await user.type(screen.getByRole('textbox', { name: 'Lot' }), 'A14-9999');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSubmit).toHaveBeenCalledWith({ lots: ['A14', 'A14-9999'] });
  });

  /** Two controls doing different things must not read as one. The list picks; the box
   *  takes what the list does not have — and a dropdown that also accepted typing showed
   *  the same answer in both places. */
  it('shows a typed answer in the box only, never as a selection in the list', async () => {
    const user = userEvent.setup();
    renderCard(
      formOf(
        field({
          key: 'lots',
          label: 'Lot',
          allowCustom: true,
          options: options('L1', 'L2', 'L3', 'L4', 'L5', 'L6'),
        })
      )
    );

    await user.type(screen.getByRole('textbox', { name: 'Lot' }), 'L9-custom');

    expect(screen.getByRole('textbox', { name: 'Lot' })).toHaveValue('L9-custom');
    // The combobox still reads as nothing chosen: what was typed is not one of its options.
    expect(document.querySelector('.ant-select-selection-item')).toBeNull();
  });
});

/** A single-answer field has one slot. Whatever fills it — a chip, a dropdown row, or
 *  something typed — leaves the other control with nothing to put there, and the answer
 *  used to be replaced silently: type into the box and the chip stayed lit while the
 *  typed value was what went out. Locking the one not in use says so up front. */
describe('QuestionFormCard: a single answer comes from one place', () => {
  const singleWithCustom = () =>
    formOf(field({ key: 'part', label: 'Part ID', options: options('A14', 'A16', 'A18'), allowCustom: true }));

  it('locks the box once an option is picked, and unlocks it when the pick is undone', async () => {
    const user = userEvent.setup();
    renderCard(singleWithCustom());

    const box = screen.getByLabelText('Part ID', { selector: 'input' });
    expect(box).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'A14' }));
    expect(box).toBeDisabled();

    // Clicking the lit chip again gives the slot back.
    await user.click(screen.getByRole('button', { name: 'A14' }));
    expect(box).toBeEnabled();
  });

  it('locks the options once something is typed, and unlocks them when the box is emptied', async () => {
    const user = userEvent.setup();
    renderCard(singleWithCustom());

    const box = screen.getByLabelText('Part ID', { selector: 'input' });
    await user.type(box, 'A14-9999');
    expect(screen.getByRole('button', { name: 'A14' })).toBeDisabled();

    await user.clear(box);
    expect(screen.getByRole('button', { name: 'A14' })).toBeEnabled();
  });

  /** A multi field holds several answers at once, so a typed value is one more of them
   *  rather than a replacement for what is picked. Nothing to lock. */
  it('leaves both open on a multi field', async () => {
    const user = userEvent.setup();
    renderCard(
      formOf(field({ key: 'lot', label: 'Lots', kind: 'multi', options: options('L1', 'L2', 'L3'), allowCustom: true }))
    );

    const box = screen.getByLabelText('Lots', { selector: 'input' });
    await user.click(screen.getByRole('button', { name: 'L1' }));
    expect(box).toBeEnabled();

    await user.type(box, 'L9-custom');
    expect(screen.getByRole('button', { name: 'L1' })).toBeEnabled();
  });
});
