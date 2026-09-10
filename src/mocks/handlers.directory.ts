import { http, HttpResponse } from 'msw';

import { DIRECTORY_SEARCH_MIN_LENGTH } from '@/api/directoryApi';
import type { DirectoryEntry } from '@/types/api';
import { directoryEntryMatches } from '@/utils/directoryEntry';

const ORGS: DirectoryEntry[] = [
  {
    type: 'ORG',
    orgId: 'A10INTD1-1',
    orgName: '整合技術一部一課',
    orgLevel: 'DEPARTMENT',
    sortName: '整合技術一部一課',
  },
  {
    type: 'ORG',
    orgId: 'A10INTD1-2',
    orgName: '整合技術一部二課',
    orgLevel: 'DEPARTMENT',
    sortName: '整合技術一部二課',
  },
  {
    type: 'ORG',
    orgId: 'A10PITD1-1',
    orgName: '製程整合一部一課',
    orgLevel: 'DEPARTMENT',
    sortName: '製程整合一部一課',
  },
  { type: 'ORG', orgId: 'INTD-1', orgName: '整合技術一課', orgLevel: 'SECTION', sortName: '整合技術一課' },
  { type: 'ORG', orgId: 'INTD-2', orgName: '整合技術二課', orgLevel: 'SECTION', sortName: '整合技術二課' },
  { type: 'ORG', orgId: 'PITD-1', orgName: '製程整合一課', orgLevel: 'SECTION', sortName: '製程整合一課' },
];

const EMPLOYEES: DirectoryEntry[] = [
  {
    type: 'EMPLOYEE',
    employeeNt: 'CHXXGHYC',
    employeeName: '鄭凱宇',
    employeeOrgName: 'INTD-1',
    emplId: '901234',
    sortName: '鄭凱宇',
  },
  {
    type: 'EMPLOYEE',
    employeeNt: 'CHXXABCD',
    employeeName: '王思涵',
    employeeOrgName: 'INTD-1',
    emplId: '901235',
    sortName: '王思涵',
  },
  {
    type: 'EMPLOYEE',
    employeeNt: 'CHXXKLWU',
    employeeName: '吳克良',
    employeeOrgName: 'INTD-2',
    emplId: '901236',
    sortName: '吳克良',
  },
  {
    type: 'EMPLOYEE',
    employeeNt: 'CHXXSHLN',
    employeeName: '林淑惠',
    employeeOrgName: 'PITD-1',
    emplId: '901237',
    sortName: '林淑惠',
  },
  {
    type: 'EMPLOYEE',
    employeeNt: 'CHXXYCCN',
    employeeName: '陳彥志',
    employeeOrgName: 'PITD-1',
    emplId: '901238',
    sortName: '陳彥志',
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
