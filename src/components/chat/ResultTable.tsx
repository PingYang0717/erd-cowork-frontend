import { Table, type TableColumnsType } from 'antd';
import React, { useMemo } from 'react';

import type { TableCellValue, TableResult } from '@/types/api';

import styles from './ResultTable.module.css';

/** Number of rows above which antd's pagination kicks in (cowork upstream). */
const PAGINATION_THRESHOLD = 20;
const PAGE_SIZE = 20;

type ResultTableRecord = Record<string, TableCellValue> & { key: string };

/** Trims float noise via significant digits (toPrecision(12)), not a fixed decimal
 *  position — a fixed position would corrupt large-magnitude values. Re-expands JS's
 *  exponent fallback. (Ported verbatim from cowork upstream, ADR-0002.) */
function expandExponentialNotation(exponentialText: string): string {
  const exponentMatch = /^(-?)(\d+)(?:\.(\d+))?e([+-]\d+)$/i.exec(exponentialText);
  if (!exponentMatch) return exponentialText;
  const [, sign, integerDigits, fractionDigits = '', exponentText] = exponentMatch;
  const digits = integerDigits + fractionDigits;
  const decimalPointPosition = integerDigits.length + Number.parseInt(exponentText, 10);
  if (decimalPointPosition <= 0) {
    return `${sign}0.${'0'.repeat(-decimalPointPosition)}${digits}`;
  }
  if (decimalPointPosition >= digits.length) {
    return `${sign}${digits}${'0'.repeat(decimalPointPosition - digits.length)}`;
  }
  return `${sign}${digits.slice(0, decimalPointPosition)}.${digits.slice(decimalPointPosition)}`;
}

function formatCellValue(value: TableCellValue): string {
  // A null cell is "no value", which reads as blank — not as "null".
  if (value === null) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Number.isInteger(value)) return String(value);
    // toPrecision(12) then re-parsing as a Number drops trailing zeros exactly like the
    // backend's shorten-then-rstrip("0") does, without a regex.
    const shortened = Number(value.toPrecision(12)).toString();
    return shortened.includes('e') ? expandExponentialNotation(shortened) : shortened;
  }
  return String(value);
}

interface ResultTableProps {
  table: TableResult;
}

/** One query result the run produced on its way to the artifact. Live-only: the data is
 *  large and goes stale, so it is never persisted with the conversation (ADR-0003).
 *  Rendering is cowork upstream's: an intent caption over an antd Table that paginates
 *  past 20 rows and scrolls sideways instead of widening the thread (ADR-0002). */
const ResultTable: React.FC<ResultTableProps> = ({ table }) => {
  // The `?? []` fallbacks are defensive: the wire contract guarantees both fields, but
  // a contract violation (e.g. Jackson nulling a missing field upstream) must not crash
  // the live bubble. They live inside the memos so the deps are the wire fields
  // themselves, not a fresh array per render.
  const tableColumns: TableColumnsType<ResultTableRecord> = useMemo(
    () =>
      (table.columns ?? []).map((columnName, columnIndex) => ({
        title: columnName,
        dataIndex: `col_${columnIndex}`,
        key: `col_${columnIndex}`,
        render: (value: TableCellValue) => formatCellValue(value),
      })),
    [table.columns],
  );

  const dataSource: ResultTableRecord[] = useMemo(
    () =>
      (table.rows ?? []).map((row, rowIndex) => {
        const record: ResultTableRecord = { key: `row-${rowIndex}` };
        row.forEach((cellValue, columnIndex) => {
          record[`col_${columnIndex}`] = cellValue;
        });
        return record;
      }),
    [table.rows],
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.caption}>{table.intent}</div>
      <Table<ResultTableRecord>
        columns={tableColumns}
        dataSource={dataSource}
        size="small"
        pagination={dataSource.length > PAGINATION_THRESHOLD ? { pageSize: PAGE_SIZE } : false}
        scroll={{ x: 'max-content' }}
        components={{
          // antd offers no aria-label prop; the intent must still be the table's
          // accessible name, as it was when this was a hand-rolled <table>.
          table: (tableProps: React.HTMLAttributes<HTMLTableElement>) => (
            <table {...tableProps} aria-label={table.intent} />
          ),
        }}
      />
      {table.truncated && <p className={styles.truncated}>(前 200 列)</p>}
    </div>
  );
};

const MemoisedResultTable = React.memo(ResultTable);

export default MemoisedResultTable;
