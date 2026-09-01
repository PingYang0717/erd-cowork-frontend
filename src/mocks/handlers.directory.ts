import { http, HttpResponse } from 'msw';

import { DIRECTORY_SEARCH_MIN_LENGTH } from '@/api/directoryApi';
import type { DirectoryEntry } from '@/types/api/index';
import { directoryEntryLabel } from '@/utils/directoryEntry';

const ORGS: DirectoryEntry[] = [
  { type: 'ORG', orgId: 'A10INTD1-1', orgName: '整合技術一部一課', orgLevel: 'DEPARTMENT' },
  { type: 'ORG', orgId: 'A10INTD1-2', orgName: '整合技術一部二課', orgLevel: 'DEPARTMENT' },
  { type: 'ORG', orgId: 'A10PITD1-1', orgName: '製程整合一部一課', orgLevel: 'DEPARTMENT' },
  { type: 'ORG', orgId: 'INTD-1', orgName: '整合技術一課', orgLevel: 'SECTION' },
  { type: 'ORG', orgId: 'INTD-2', orgName: '整合技術二課', orgLevel: 'SECTION' },
  { type: 'ORG', orgId: 'PITD-1', orgName: '製程整合一課', orgLevel: 'SECTION' },
];

const EMPLOYEES: DirectoryEntry[] = [
  { type: 'EMPLOYEE', employeeNt: 'CHXXGHYC', employeeName: '鄭凱宇', employeeOrgName: 'INTD-1' },
  { type: 'EMPLOYEE', employeeNt: 'CHXXABCD', employeeName: '王思涵', employeeOrgName: 'INTD-1' },
  { type: 'EMPLOYEE', employeeNt: 'CHXXKLWU', employeeName: '吳克良', employeeOrgName: 'INTD-2' },
  { type: 'EMPLOYEE', employeeNt: 'CHXXSHLN', employeeName: '林淑惠', employeeOrgName: 'PITD-1' },
  { type: 'EMPLOYEE', employeeNt: 'CHXXYCCN', employeeName: '陳彥志', employeeOrgName: 'PITD-1' },
];

const DIRECTORY = [...ORGS, ...EMPLOYEES];

export const directoryHandlers = [
  // The real endpoint searches the HR directory; here the same fixed roster is filtered
  // on the text the picker would show, so the wire shape and the minimum-key rule are
  // what a test exercises.
  http.get('/api/hr/employeesAndOrgs', ({ request }) => {
    const key = new URL(request.url).searchParams.get('key')?.trim() ?? '';
    if (key.length < DIRECTORY_SEARCH_MIN_LENGTH) {
      return HttpResponse.json({ content: [] });
    }
    const needle = key.toLowerCase();
    // The real endpoint answers inside a `content` envelope; so does this, or the
    // unwrapping would never be exercised.
    return HttpResponse.json({
      content: DIRECTORY.filter((entry) =>
        directoryEntryLabel(entry).toLowerCase().includes(needle),
      ),
    });
  }),
];
