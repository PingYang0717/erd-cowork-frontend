import { describe, expect, it } from 'vitest';

import type { DirectoryEntry } from '@/types/api/index';

import { directoryEntryKey, directoryEntryLabel, directoryShareTarget } from './directoryEntry';

const org: DirectoryEntry = {
  type: 'ORG',
  orgId: 'SEC-11',
  orgName: '示範一課',
  orgLevel: 'SECTION',
};

const employee: DirectoryEntry = {
  type: 'EMPLOYEE',
  employeeNt: 'NTDEMO01',
  employeeName: '示範甲',
  employeeOrgName: 'SEC-11',
};

describe('directoryEntryLabel', () => {
  it('reads an organisation as its id and name', () => {
    expect(directoryEntryLabel(org)).toBe('SEC-11 | 示範一課');
  });

  it('reads a person as their org, account and name', () => {
    expect(directoryEntryLabel(employee)).toBe('SEC-11 | NTDEMO01 | 示範甲');
  });
});

describe('directoryShareTarget', () => {
  /** An organisation's kind, to the backend, is its level — there is no separate field
   *  saying "department" or "section", so the level is what has to travel. */
  it('sends an organisation under its level, identified by org id', () => {
    expect(directoryShareTarget(org)).toEqual({ type: 'SECTION', id: 'SEC-11' });
  });

  it('sends a person as EMPLOYEE, identified by NT account', () => {
    expect(directoryShareTarget(employee)).toEqual({ type: 'EMPLOYEE', id: 'NTDEMO01' });
  });

  it('sends a department under its own level, not a shared ORG constant', () => {
    expect(directoryShareTarget({ ...org, orgId: 'DEPT-11', orgLevel: 'DEPARTMENT' })).toEqual({
      type: 'DEPARTMENT',
      id: 'DEPT-11',
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
