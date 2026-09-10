import { describe, expect, it } from 'vitest';

import type { DirectoryEntry } from '@/types/api';
import {
  directoryEntryKey,
  directoryEntryMatches,
  directoryEntryOptionText,
  directoryEntrySelectedName,
  directoryShareTarget,
  employeeAvatarUrl,
} from './directoryEntry';

const org: DirectoryEntry = {
  type: 'ORG',
  orgId: 'INTD-1',
  orgName: '整合技術一課',
  orgLevel: 'SECTION',
  sortName: '整合技術一課',
};

const employee: DirectoryEntry = {
  type: 'EMPLOYEE',
  employeeNt: 'CHXXGHYC',
  employeeName: '鄭凱宇',
  employeeOrgName: 'INTD-1',
  emplId: '901234',
  sortName: '鄭凱宇',
};

/** The list and the chosen tags answer different questions. A row in the list is being
 *  told apart from other rows, so an organisation carries its code; a chosen tag is
 *  already settled, so both kinds read as the one short name. */
describe('directoryEntryOptionText', () => {
  it('reads an organisation as its name and code', () => {
    expect(directoryEntryOptionText(org)).toBe('整合技術一課 (INTD-1)');
  });

  it('reads a person as their short name — the photo beside it says who they are', () => {
    expect(directoryEntryOptionText(employee)).toBe('鄭凱宇');
  });

  /** Nothing renders as `undefined`: the two new fields are optional on the wire, and a
   *  row that arrived without one still has to read as something. */
  it('falls back when the wire left the short name out', () => {
    expect(directoryEntryOptionText({ ...employee, sortName: undefined })).toBe('鄭凱宇');
    expect(directoryEntryOptionText({ type: 'ORG', orgId: 'INTD-9' })).toBe('INTD-9');
  });
});

describe('directoryEntrySelectedName', () => {
  it('reads both kinds as the one short name', () => {
    expect(directoryEntrySelectedName(org)).toBe('整合技術一課');
    expect(directoryEntrySelectedName(employee)).toBe('鄭凱宇');
  });

  it('falls back when the wire left the short name out', () => {
    expect(directoryEntrySelectedName({ ...org, sortName: undefined })).toBe('整合技術一課');
    expect(directoryEntrySelectedName({ ...employee, sortName: undefined })).toBe('鄭凱宇');
  });
});

describe('employeeAvatarUrl', () => {
  it('keys the photo on the employee id', () => {
    expect(employeeAvatarUrl('901234')).toMatch(/\/901234\.jpg$/);
  });

  /** No id, no photo — and an <img> pointed at a URL ending in `/undefined.jpg` is a
   *  broken image on screen, not an absence. */
  it('has no photo for a row with no employee id', () => {
    expect(employeeAvatarUrl(undefined)).toBeNull();
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
      directoryEntryKey({ type: 'EMPLOYEE', employeeNt: 'X1' })
    );
  });
});

describe('directoryEntryMatches', () => {
  /** Every field a row can be found by, not just the ones the label prints. Someone
   *  searching by an org code has to find the people in it, and matching the label alone
   *  would answer "no such person". */
  it.each([
    ['name', '鄭凱宇'],
    ['NT account', 'chxxghyc'],
    ['their org', 'intd-1'],
  ])('finds a person by %s', (_field, keyword) => {
    expect(directoryEntryMatches(employee, keyword)).toBe(true);
  });

  it.each([
    ['org id', 'intd-1'],
    ['org name', '整合技術'],
    ['level', 'section'],
  ])('finds an organisation by %s', (_field, keyword) => {
    expect(directoryEntryMatches(org, keyword)).toBe(true);
  });

  it('does not match something absent from every field', () => {
    expect(directoryEntryMatches(employee, 'zzz')).toBe(false);
  });
});
