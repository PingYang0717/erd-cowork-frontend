import { AxiosError, AxiosHeaders, CanceledError } from 'axios';
import { describe, expect, it } from 'vitest';

import { AgentStreamHttpError } from './agentApi';
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
    const axiosErr = axiosErrorWith(410, { code: 'FILES_EXPIRED', message: '檔案已過期' });
    expect(errorCode(axiosErr)).toBe('FILES_EXPIRED');
    expect(errorMessage(axiosErr)).toBe('檔案已過期');

    const streamErr = new AgentStreamHttpError('SESSION_BUSY', 'busy');
    expect(errorCode(streamErr)).toBe('SESSION_BUSY');
    expect(errorMessage(streamErr)).toBe('busy');

    expect(errorCode(new Error('boom'))).toBeNull();
    expect(errorMessage(axiosErrorWith(500, { message: 42 }))).toBeNull();
  });
});
