import { http, HttpResponse } from 'msw';

import { DIRECTORY_SEARCH_MIN_LENGTH } from '@/api/directoryApi';
import type { DirectoryEntry } from '@/types/api/index';

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

const PEOPLE = [
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

const DIRECTORY: DirectoryEntry[] = [
  ...DEPARTMENT_CODES.map((code) => ({ id: code, kind: 'department' as const, label: code })),
  ...SECTION_CODES.map((code) => ({ id: code, kind: 'section' as const, label: code })),
  ...PEOPLE.map((p) => ({
    id: p.account,
    kind: 'person' as const,
    label: `${p.account} · ${p.name}`,
  })),
];

export const directoryHandlers = [
  // The real endpoint searches the HR directory; here the same fixed roster is filtered,
  // so the wire shape and the minimum-key rule are what a test exercises.
  http.get('/api/hr/employeesAndOrgs', ({ request }) => {
    const key = new URL(request.url).searchParams.get('key')?.trim() ?? '';
    if (key.length < DIRECTORY_SEARCH_MIN_LENGTH) {
      return HttpResponse.json([]);
    }
    const needle = key.toLowerCase();
    return HttpResponse.json(
      DIRECTORY.filter((entry) => entry.label.toLowerCase().includes(needle)),
    );
  }),
];
