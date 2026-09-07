import { AxiosError, AxiosHeaders, CanceledError } from 'axios';
import { describe, expect, it } from 'vitest';

import { AgentStreamHttpError } from './agentStreamError';
import { errorCode, errorMessage, httpStatus, isCanceled, isOffline } from './apiError';

const axiosErrorWith = (status: number, data: unknown): AxiosError =>
  new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data,
  });

describe('apiError', () => {
  it('reads a response-less axios error as offline', () => {
    expect(isOffline(new AxiosError('Network Error'))).toBe(true);
    expect(isOffline(axiosErrorWith(500, {}))).toBe(false);
    expect(isOffline(new Error('boom'))).toBe(false);
  });

  it('recognises a cancellation under either of its transport spellings', () => {
    // The same fact arrives as CanceledError from axios and AbortError from fetch;
    // callers must not have to know which transport their request rode.
    expect(isCanceled(new CanceledError('canceled'))).toBe(true);
    expect(isCanceled(new DOMException('aborted', 'AbortError'))).toBe(true);
    expect(isCanceled(new Error('boom'))).toBe(false);
  });

  it('surfaces the status only when the backend actually answered', () => {
    expect(httpStatus(axiosErrorWith(503, {}))).toBe(503);
    expect(httpStatus(new AxiosError('Network Error'))).toBeNull();
  });

  it('reads the backend code and message from either transport', () => {
    // 409, the status the backend actually answers FILES_EXPIRED with. The status is
    // incidental to what this asserts — the code and message are read from the body — but
    // a fixture is also a record of the wire, and this one said 410.
    const axiosErr = axiosErrorWith(409, { code: 'FILES_EXPIRED', message: '檔案已過期' });
    expect(errorCode(axiosErr)).toBe('FILES_EXPIRED');
    expect(errorMessage(axiosErr)).toBe('檔案已過期');

    const streamErr = new AgentStreamHttpError(409, 'SESSION_BUSY', 'busy');
    expect(errorCode(streamErr)).toBe('SESSION_BUSY');
    expect(errorMessage(streamErr)).toBe('busy');

    expect(errorCode(new Error('boom'))).toBeNull();
    expect(errorMessage(axiosErrorWith(500, { message: 42 }))).toBeNull();
  });
});
