import { describe, expect, it } from 'vitest';

import type { UploadedFileInfo } from '@/types/api';
import { planFileAdditions } from './uploadValidation';

const GB = 1024 * 1024 * 1024;

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

describe('planFileAdditions', () => {
  it('skips a duplicate by name — and says so instead of silently dropping it', () => {
    const plan = planFileAdditions(
      [existingFile('a.csv', 100)],
      [
        { name: 'a.csv', size: 100 },
        { name: 'b.xlsx', size: 200 },
      ]
    );

    // Re-dragging the same file is usually an attempt to replace it; the message is
    // what tells the user why nothing changed. The other file still goes through.
    expect(plan.accepted.map((file) => file.name)).toEqual(['b.xlsx']);
    expect(plan.error).toBe('A file with the same name is already attached');
  });

  it('rejects unsupported extensions with the dictionary error, without blocking later files', () => {
    const plan = planFileAdditions(
      [],
      [
        { name: 'notes.pdf', size: 100 },
        { name: 'lots.csv', size: 100 },
      ]
    );

    expect(plan.accepted.map((file) => file.name)).toEqual(['lots.csv']);
    expect(plan.error).toBe('Only .csv / .xlsx are supported');
  });

  it('caps the total at 5 files', () => {
    const plan = planFileAdditions(
      [],
      Array.from({ length: 6 }, (_, i) => ({ name: `file-${i}.csv`, size: 100 }))
    );

    expect(plan.accepted).toHaveLength(5);
    expect(plan.error).toBe('Up to 5 files');
  });

  it('rejects a file that would push the total over 5 GB', () => {
    const plan = planFileAdditions([existingFile('big-1.csv', 4 * GB)], [{ name: 'big-2.csv', size: 2 * GB }]);

    expect(plan.accepted).toHaveLength(0);
    expect(plan.error).toBe('5 GB in total');
  });
});
