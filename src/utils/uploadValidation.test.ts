import { describe, expect, it } from 'vitest';

import { BYTES_PER_GB, BYTES_PER_MB } from '@/constants/bytes';
import type { UploadedFileInfo } from '@/types/api';
import { DEFAULT_UPLOAD_LIMITS, planFileAdditions, type UploadLimits } from './uploadValidation';

const GB = BYTES_PER_GB;

const existingFile = (name: string, sizeBytes: number): UploadedFileInfo => {
  return {
    id: name,
    name,
    alias: 't1',
    sizeBytes,
    type: 'text/csv',
    rowCount: null,
    expired: false,
  };
};

/** What `GET /config` publishes, in the shape the validator takes it. */
const limits: UploadLimits = {
  maxFiles: 5,
  maxSessionBytes: 5 * GB,
  singleFileLimits: { csv: 2 * GB, xlsx: 200 * BYTES_PER_MB, xls: 200 * BYTES_PER_MB },
};

describe('planFileAdditions', () => {
  it('skips a duplicate by name — and says so instead of silently dropping it', () => {
    const plan = planFileAdditions(
      [existingFile('a.csv', 100)],
      [
        { name: 'a.csv', size: 100 },
        { name: 'b.xlsx', size: 200 },
      ],
      limits
    );

    // Re-dragging the same file is usually an attempt to replace it; the message is
    // what tells the user why nothing changed. The other file still goes through.
    expect(plan.accepted.map((file) => file.name)).toEqual(['b.xlsx']);
    expect(plan.error).toBe('A file with the same name is already attached');
  });

  /** The accepted extensions ARE the keys of `singleFileLimits` — one source, so a type
   *  the backend starts accepting arrives with its own size cap rather than needing a
   *  second list kept in step. */
  it('accepts exactly the types the backend published a limit for', () => {
    const plan = planFileAdditions(
      [],
      [
        { name: 'notes.pdf', size: 100 },
        { name: 'lots.csv', size: 100 },
      ],
      limits
    );

    expect(plan.accepted.map((file) => file.name)).toEqual(['lots.csv']);
    expect(plan.error).toBe('Only .csv, .xlsx, .xls are supported');
  });

  it('follows the backend when it publishes a different set of types', () => {
    const plan = planFileAdditions([], [{ name: 'lots.parquet', size: 100 }], {
      ...limits,
      singleFileLimits: { parquet: 1 * GB },
    });

    expect(plan.accepted.map((file) => file.name)).toEqual(['lots.parquet']);
    expect(plan.error).toBe('');
  });

  /** The check that did not exist. `singleFileLimits` caps each type separately — a
   *  spreadsheet at 200 MB, a CSV at 2 GB — and the frontend read neither, so a 500 MB
   *  .xlsx uploaded in full before the backend refused it. */
  it('rejects a file over the limit published for its own type', () => {
    const plan = planFileAdditions([], [{ name: 'wafers.xlsx', size: 500 * BYTES_PER_MB }], limits);

    expect(plan.accepted).toHaveLength(0);
    expect(plan.error).toBe('wafers.xlsx is over the 200 MB limit');
  });

  it('lets a file of another type through at a size its own limit allows', () => {
    const plan = planFileAdditions([], [{ name: 'wafers.csv', size: 500 * BYTES_PER_MB }], limits);

    expect(plan.accepted.map((file) => file.name)).toEqual(['wafers.csv']);
  });

  it('caps the count at what the backend published', () => {
    const plan = planFileAdditions(
      [],
      Array.from({ length: 6 }, (_, i) => ({ name: `file-${i}.csv`, size: 100 })),
      limits
    );

    expect(plan.accepted).toHaveLength(5);
    expect(plan.error).toBe('Up to 5 files');
  });

  it('rejects a file that would push the session over its total', () => {
    const plan = planFileAdditions(
      [existingFile('big-1.csv', 4 * GB)],
      [{ name: 'big-2.csv', size: 1.5 * GB }],
      limits
    );

    expect(plan.accepted).toHaveLength(0);
    expect(plan.error).toBe('5 GB in total');
  });

  /** `GET /config` is not validated at runtime (ADR-0013). A body without
   *  `singleFileLimits` would otherwise leave the whitelist empty and refuse every file —
   *  the guardrails failing shut, on a screen where the user can do nothing about it. */
  it('falls back to its own limits when the config is missing or malformed', () => {
    const shapeless = { maxFiles: 5, maxSessionBytes: 5 * GB } as unknown as UploadLimits;

    const plan = planFileAdditions([], [{ name: 'lots.csv', size: 100 }], shapeless);

    expect(plan.accepted.map((file) => file.name)).toEqual(['lots.csv']);
    expect(DEFAULT_UPLOAD_LIMITS.singleFileLimits.csv).toBeGreaterThan(0);
  });
});
