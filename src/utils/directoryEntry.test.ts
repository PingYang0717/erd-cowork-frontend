import { describe, expect, it } from 'vitest';

import type { DirectoryEntry } from '@/types/api/index';

import {
  directoryEntryKey,
  directoryEntryLabel,
  directoryEntryMatches,
  directoryShareTarget,
  shareAsDirectoryEntry,
} from './directoryEntry';

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

describe('directoryEntryMatches', () => {
  /** Every field a row can be found by, not just the ones the label prints. Someone
   *  searching by an org code has to find the people in it, and matching the label alone
   *  would answer "no such person". */
  it.each([
    ['name', '示範甲'],
    ['NT account', 'ntdemo01'],
    ['their org', 'sec-11'],
  ])('finds a person by %s', (_field, keyword) => {
    expect(directoryEntryMatches(employee, keyword)).toBe(true);
  });

  it.each([
    ['org id', 'sec-11'],
    ['org name', '示範'],
    ['level', 'section'],
  ])('finds an organisation by %s', (_field, keyword) => {
    expect(directoryEntryMatches(org, keyword)).toBe(true);
  });

  it('does not match something absent from every field', () => {
    expect(directoryEntryMatches(employee, 'zzz')).toBe(false);
  });
});

describe('shareAsDirectoryEntry', () => {
  /** The read side spells a recipient across three id fields, one per kind. Reading the
   *  wrong one leaves the chip empty, which looks exactly like "not shared with anyone". */
  it('reads a person out of shareTargetUserId', () => {
    const entry = shareAsDirectoryEntry({
      shareTargetType: 'EMPLOYEE',
      shareTargetUserId: 'NTDEMO01',
    });
    expect(directoryShareTarget(entry)).toEqual({ type: 'EMPLOYEE', id: 'NTDEMO01' });
  });

  it('reads a section out of shareTargetSectionId, keeping its level', () => {
    const entry = shareAsDirectoryEntry({
      shareTargetType: 'SECTION',
      shareTargetSectionId: 'SEC-11',
    });
    expect(directoryShareTarget(entry)).toEqual({ type: 'SECTION', id: 'SEC-11' });
  });

  it('reads a department out of shareTargetDeptId', () => {
    const entry = shareAsDirectoryEntry({
      shareTargetType: 'DEPARTMENT',
      shareTargetDeptId: 'DEPT-11',
    });
    expect(directoryShareTarget(entry)).toEqual({ type: 'DEPARTMENT', id: 'DEPT-11' });
  });
});
