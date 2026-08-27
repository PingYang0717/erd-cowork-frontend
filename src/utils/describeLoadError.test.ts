import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';

import { describeLoadError } from './describeLoadError';

function axiosError(code: string, response?: AxiosError['response']) {
  const error = new AxiosError('Network Error', code);
  error.response = response;
  return error;
}

describe('describeLoadError', () => {
  it('names an unreachable backend rather than repeating "Network Error"', () => {
    expect(describeLoadError(axiosError('ERR_NETWORK'))).toEqual({
      heading: '無法連線到後端服務',
      detail: '請確認服務已啟動後重試。',
    });
  });

  it('distinguishes a timeout from a refused connection', () => {
    expect(describeLoadError(axiosError('ECONNABORTED')).heading).toBe('後端服務沒有回應');
  });

  it('leaves an answered request to its own message — the backend replied, so the error is real', () => {
    const answered = axiosError('ERR_BAD_REQUEST', {
      status: 500,
      statusText: 'Internal Server Error',
      data: null,
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    });
    expect(describeLoadError(answered)).toEqual({
      heading: '這個區塊載入失敗',
      detail: 'Network Error',
    });
  });

  it('passes a plain render error straight through', () => {
    expect(describeLoadError(new Error('boom'))).toEqual({
      heading: '這個區塊載入失敗',
      detail: 'boom',
    });
  });
});
