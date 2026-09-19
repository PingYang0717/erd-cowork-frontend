import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import ComingSoon from './ComingSoon';

const renderPage = () =>
  render(
    <ComingSoon
      label="Skills"
      icon={<svg data-testid="skills-icon" />}
      title="Coming soon"
      detail="Skills are on their way."
    />
  );

describe('ComingSoon', () => {
  it('says what the feature is and that it is not here yet', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Coming soon' })).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Skills are on their way.')).toBeInTheDocument();
  });

  /** CONTEXT.md, Skills: nothing to operate. The page is a sign, not a form — a control
   *  here would promise something behind it. */
  it('offers nothing to press, type in or follow', () => {
    renderPage();

    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  });

  it('keeps the icon decorative — it is already named by the label beside it', () => {
    renderPage();

    expect(screen.getByTestId('skills-icon').parentElement).toHaveAttribute('aria-hidden', 'true');
  });
});
