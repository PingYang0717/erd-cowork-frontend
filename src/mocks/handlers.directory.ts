import { http, HttpResponse } from 'msw';

import { DIRECTORY_SEARCH_MIN_LENGTH } from '@/api/directoryApi';
import type { DirectoryEntry } from '@/types/api';
import { directoryEntryMatches } from '@/utils/directoryEntry';

const ORGS: DirectoryEntry[] = [
  {
    type: 'ORG',
    orgId: 'DEPT-11',
    orgName: '示範一部一課',
    orgLevel: 'DEPARTMENT',
    sortName: '示範一部一課',
  },
  {
    type: 'ORG',
    orgId: 'DEPT-12',
    orgName: '示範一部二課',
    orgLevel: 'DEPARTMENT',
    sortName: '示範一部二課',
  },
  {
    type: 'ORG',
    orgId: 'DEPT-31',
    orgName: '示範三部一課',
    orgLevel: 'DEPARTMENT',
    sortName: '示範三部一課',
  },
  { type: 'ORG', orgId: 'SEC-11', orgName: '示範一課', orgLevel: 'SECTION', sortName: '示範一課' },
  { type: 'ORG', orgId: 'SEC-12', orgName: '示範二課', orgLevel: 'SECTION', sortName: '示範二課' },
  { type: 'ORG', orgId: 'SEC-31', orgName: '示範三課', orgLevel: 'SECTION', sortName: '示範三課' },
];

const EMPLOYEES: DirectoryEntry[] = [
  {
    type: 'EMPLOYEE',
    employeeNt: 'NTDEMO01',
    employeeName: '示範甲',
    employeeOrgName: 'SEC-11',
    emplId: '901234',
    sortName: '示範甲',
  },
  {
    type: 'EMPLOYEE',
    employeeNt: 'NTDEMO02',
    employeeName: '示範乙',
    employeeOrgName: 'SEC-11',
    emplId: '901235',
    sortName: '示範乙',
  },
  {
    type: 'EMPLOYEE',
    employeeNt: 'NTDEMO03',
    employeeName: '示範丙',
    employeeOrgName: 'SEC-12',
    emplId: '901236',
    sortName: '示範丙',
  },
  {
    type: 'EMPLOYEE',
    employeeNt: 'NTDEMO04',
    employeeName: '示範丁',
    employeeOrgName: 'SEC-31',
    emplId: '901237',
    sortName: '示範丁',
  },
  {
    type: 'EMPLOYEE',
    employeeNt: 'NTDEMO05',
    employeeName: '示範戊',
    employeeOrgName: 'SEC-31',
    emplId: '901238',
    sortName: '示範戊',
  },
];

const DIRECTORY = [...ORGS, ...EMPLOYEES];

/** The real endpoint does not take Chinese input (2026-09-10), so neither does this. The
 *  roster is full of Chinese names and would happily answer to one — which would let the
 *  picker be built and tested against a search that does not exist anywhere but here. */
const HAS_CHINESE = /[\u4e00-\u9fff]/;

export const directoryHandlers = [
  // The real endpoint searches the HR directory; here the same fixed roster is filtered,
  // so the wire shape and the minimum-length rule are what a test exercises. Reading the
  // param by name is deliberate: a rename on either side should fail loudly here rather
  // than silently return the whole roster.
  http.get('/api/hr/employeesAndOrgs', ({ request }) => {
    const keyword = new URL(request.url).searchParams.get('keyword')?.trim() ?? '';
    if (keyword.length < DIRECTORY_SEARCH_MIN_LENGTH || HAS_CHINESE.test(keyword)) {
      return HttpResponse.json({ content: [] });
    }
    // Matched on every field, the same way the picker narrows — a roster searchable only
    // by the parts the label shows would make the two disagree about what exists.
    // Enveloped in `content` like the real endpoint, or the unwrapping is never
    // exercised.
    return HttpResponse.json({
      content: DIRECTORY.filter((entry) => directoryEntryMatches(entry, keyword)),
    });
  }),
];
