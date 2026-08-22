import type { DirectoryEntry } from '@/types/api/directory';

const DEPARTMENT_CODES = [
  'DEPT-11',
  'DEPT-12',
  'DEPT-21',
  'DEPT-22',
  'DEPT-31',
  'DEPT-32',
  'DEPT-41',
  'DEPT-51',
];

const SECTION_CODES = ['SEC-11', 'SEC-12', 'SEC-13', 'SEC-31', 'SEC-32', 'SEC-41', 'SEC-51'];

const PEOPLE: Array<{ account: string; name: string }> = [
  { account: 'NTDEMO01', name: '示範甲' },
  { account: 'NTDEMO02', name: '示範乙' },
  { account: 'NTDEMO03', name: '示範丙' },
  { account: 'NTDEMO04', name: '示範丁' },
  { account: 'NTDEMO05', name: '示範戊' },
  { account: 'NTDEMO06', name: '示範己' },
  { account: 'NTDEMO07', name: '示範庚' },
  { account: 'NTDEMO08', name: '示範辛' },
  { account: 'NTDEMO09', name: '示範壬' },
  { account: 'NTDEMO10', name: '示範癸' },
];

export const DIRECTORY_FIXTURES: DirectoryEntry[] = [
  ...DEPARTMENT_CODES.map((code) => ({ id: code, kind: 'department' as const, label: code })),
  ...SECTION_CODES.map((code) => ({ id: code, kind: 'section' as const, label: code })),
  ...PEOPLE.map((p) => ({
    id: p.account,
    kind: 'person' as const,
    label: `${p.account} · ${p.name}`,
  })),
];
