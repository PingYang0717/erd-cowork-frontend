import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { TableResult } from '@/types/api';

import ResultTable from './ResultTable';

const table = (overrides: Partial<TableResult> = {}): TableResult => ({
  tableId: 't1',
  intent: 'Top offending lots',
  columns: ['lot', 'cpk'],
  rows: [['L1', 0.9]],
  truncated: false,
  ...overrides,
});

describe('ResultTable', () => {
  it('renders the intent as the caption and the accessible table name', () => {
    render(<ResultTable table={table()} />);

    expect(screen.getByRole('table', { name: 'Top offending lots' })).toBeInTheDocument();
    // columnheader, not text: antd keeps a hidden width-measure copy of each title.
    expect(screen.getByRole('columnheader', { name: 'lot' })).toBeInTheDocument();
    expect(screen.getByText('L1')).toBeInTheDocument();
  });

  it('trims float noise, spells out exponents, and blanks null cells', () => {
    render(
      <ResultTable
        table={table({
          columns: ['value'],
          rows: [[0.1 + 0.2], [1e-7], [true], [null], [12345]],
        })}
      />,
    );

    // 0.1 + 0.2 is 0.30000000000000004 in IEEE754; the reader gets the number
    // the query meant, not the representation artefact.
    expect(screen.getByText('0.3')).toBeInTheDocument();
    // JS falls back to exponent notation below 1e-6; the cell re-expands it.
    expect(screen.getByText('0.0000001')).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
    expect(screen.getByText('12345')).toBeInTheDocument();
    expect(screen.queryByText(/e-7/i)).not.toBeInTheDocument();
  });

  it('paginates once the result outgrows 20 rows', () => {
    const rows = Array.from({ length: 25 }, (_, rowIndex) => [`lot-${rowIndex}`]);
    render(<ResultTable table={table({ columns: ['lot'], rows })} />);

    // Page 1 holds the first 20; the rest live behind the pager.
    expect(screen.getByText('lot-0')).toBeInTheDocument();
    expect(screen.queryByText('lot-24')).not.toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: '2' })).toBeInTheDocument();
  });

  it('shows every row of a small result without a pager', () => {
    const rows = Array.from({ length: 20 }, (_, rowIndex) => [`lot-${rowIndex}`]);
    render(<ResultTable table={table({ columns: ['lot'], rows })} />);

    expect(screen.getByText('lot-19')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /pagination/i })).not.toBeInTheDocument();
  });

  it('says the backend cut the result at 200 rows', () => {
    render(<ResultTable table={table({ truncated: true })} />);

    expect(screen.getByText('(前 200 列)')).toBeInTheDocument();
  });
});
