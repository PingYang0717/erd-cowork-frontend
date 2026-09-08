import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/mocks/server';
import { getUserInfo } from './userApi';

const EMPLOYEE = {
  type: 'EMPLOYEE',
  employeeName: '鄭凱宇',
  employeeNt: 'CHXXGHYC',
  employeeOrgName: 'INTD-1',
  emplId: 'E12345',
};

/** Who is signed in, and where their picture is.
 *
 *  The address is the part this module adds: the wire carries an employee id, not a URL,
 *  and turning one into the other is a rule the rest of the app should not have to know.
 *  It also answers with a single object — the directory search this shares a shape with
 *  wraps its rows in a `content` envelope, and reading one as the other finds nothing. */
describe('getUserInfo', () => {
  it('answers who is signed in, with the address of their picture', async () => {
    server.use(http.get('/api/hr/userInfo', () => HttpResponse.json(EMPLOYEE)));

    const user = await getUserInfo();

    expect(user.employeeName).toBe('鄭凱宇');
    expect(user.employeeOrgName).toBe('INTD-1');
    expect(user.avatarUrl).toContain('E12345');
  });
});
