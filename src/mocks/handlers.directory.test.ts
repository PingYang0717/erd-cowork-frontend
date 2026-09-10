import { describe, expect, it } from 'vitest';

import type { DirectoryEntry } from '@/types/api';

const API_BASE = '/api';

const search = async (keyword: string): Promise<DirectoryEntry[]> => {
  const response = await fetch(`${API_BASE}/hr/employeesAndOrgs?keyword=${encodeURIComponent(keyword)}`);
  return ((await response.json()) as { content: DirectoryEntry[] }).content;
};

describe('GET /api/hr/employeesAndOrgs', () => {
  it('finds people by NT account and org units by code', async () => {
    expect((await search('CHXXGHYC')).map((entry) => entry.employeeNt)).toContain('CHXXGHYC');
    expect((await search('INTD-1')).map((entry) => entry.orgId)).toContain('INTD-1');
  });

  /** The real endpoint does not take Chinese input (2026-09-10). A roster that answers to
   *  a 中文姓名 here would let the picker be built against a search that does not exist —
   *  the dialog's own hint used to offer one, and only a person trying it found out. */
  it('answers nothing to a Chinese keyword, as the real endpoint does', async () => {
    expect(await search('鄭凱宇')).toEqual([]);
    expect(await search('整合技術')).toEqual([]);
  });

  /** Below the minimum the search is not worth making: the directory is org-wide and a
   *  two-character key matches most of it. */
  it('answers nothing below the minimum key length', async () => {
    expect(await search('CH')).toEqual([]);
  });
});
