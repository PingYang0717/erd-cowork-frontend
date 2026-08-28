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

  /** `apiClient` sets no timeout (ADR-0007), so ECONNABORTED is an aborted request rather
   *  than a slow one. Either way nothing came back, so it reads the same to the user. */
  it('treats an aborted request the same as an unreachable backend', () => {
    expect(describeLoadError(axiosError('ECONNABORTED')).heading).toBe('無法連線到後端服務');
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
