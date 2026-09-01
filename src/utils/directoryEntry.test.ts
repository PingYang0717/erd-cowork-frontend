import { describe, expect, it } from 'vitest';

import type { DirectoryEntry } from '@/types/api/index';

import { directoryEntryKey, directoryEntryLabel, directoryShareTarget } from './directoryEntry';

const org: DirectoryEntry = {
  type: 'ORG',
  orgId: 'INTD-1',
  orgName: '整合技術一課',
  orgLevel: 'SECTION',
};

const employee: DirectoryEntry = {
  type: 'EMPLOYEE',
  employeeNt: 'CHXXGHYC',
  employeeName: '鄭凱宇',
  employeeOrgName: 'INTD-1',
};

describe('directoryEntryLabel', () => {
  it('reads an organisation as its id and name', () => {
    expect(directoryEntryLabel(org)).toBe('INTD-1 | 整合技術一課');
  });

  it('reads a person as their org, account and name', () => {
    expect(directoryEntryLabel(employee)).toBe('INTD-1 | CHXXGHYC | 鄭凱宇');
  });
});

describe('directoryShareTarget', () => {
  /** An organisation's kind, to the backend, is its level — there is no separate field
   *  saying "department" or "section", so the level is what has to travel. */
  it('sends an organisation under its level, identified by org id', () => {
    expect(directoryShareTarget(org)).toEqual({ type: 'SECTION', id: 'INTD-1' });
  });

  it('sends a person as EMPLOYEE, identified by NT account', () => {
    expect(directoryShareTarget(employee)).toEqual({ type: 'EMPLOYEE', id: 'CHXXGHYC' });
  });

  it('sends a department under its own level, not a shared ORG constant', () => {
    expect(directoryShareTarget({ ...org, orgId: 'A10INTD1-1', orgLevel: 'DEPARTMENT' })).toEqual({
      type: 'DEPARTMENT',
      id: 'A10INTD1-1',
    });
  });
});

describe('directoryEntryKey', () => {
  /** People and organisations arrive from one search, so their keys must not collide on
   *  a number that happens to be shared. */
  it('keeps an org and a person apart even on the same underlying id', () => {
    expect(directoryEntryKey({ type: 'ORG', orgId: 'X1' })).not.toBe(
      directoryEntryKey({ type: 'EMPLOYEE', employeeNt: 'X1' }),
    );
  });
});
