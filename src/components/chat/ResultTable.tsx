import React from 'react';

import type { TableResult } from '@/types/api/index';

import styles from './ResultTable.module.css';

interface ResultTableProps {
  table: TableResult;
}

/** One query result the run produced on its way to the artifact. Live-only: the data is
 *  large and goes stale, so it is never persisted with the conversation (ADR-0005). */
const ResultTable: React.FC<ResultTableProps> = ({ table }) => {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table} aria-label={table.intent}>
        <caption className={styles.caption}>{table.intent}</caption>
        <thead>
          <tr>
            {table.columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                // A null cell is "no value", which reads as blank — not as "null".
                <td key={cellIndex}>{cell === null ? '' : String(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.truncated && <p className={styles.truncated}>已截斷,僅顯示部分結果</p>}
    </div>
  );
};

export { ResultTable };
export default ResultTable;
