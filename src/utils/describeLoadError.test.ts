import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/en';

import { describeLoadError } from './describeLoadError';

const axiosError = (code: string, response?: AxiosError['response']) => {
  const error = new AxiosError('Network Error', code);
  error.response = response;
  return error;
};

describe('describeLoadError', () => {
  it('names an unreachable backend rather than repeating "Network Error"', () => {
    expect(describeLoadError(axiosError('ERR_NETWORK'))).toEqual({
      heading: en.errors.offlineHeading,
      detail: en.errors.offlineDetail,
    });
  });

  /** `apiClient` sets no timeout (ADR-0007), so ECONNABORTED is an aborted request rather
   *  than a slow one. Either way nothing came back, so it reads the same to the user. */
  it('treats an aborted request the same as an unreachable backend', () => {
    expect(describeLoadError(axiosError('ECONNABORTED')).heading).toBe(en.errors.offlineHeading);
  });

  /** An answered request used to be shown axios's own sentence — `Request failed with
   *  status code 500`. That is English whatever the interface is set to, and it describes
   *  axios rather than what the reader should do. The status code is the part worth
   *  keeping; the sentence around it is ours to write. */
  it('states the status the backend answered with, in the language on screen', () => {
    const answered = axiosError('ERR_BAD_REQUEST', {
      status: 500,
      statusText: 'Internal Server Error',
      data: null,
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    });
    expect(describeLoadError(answered)).toEqual({
      heading: en.errors.loadFailedHeading,
      detail: en.errors.loadFailedDetail(500),
    });
  });

  /** A render error is not a request: there is no status to name, and its message is the
   *  only thing that says what went wrong. */
  it('passes a plain render error straight through', () => {
    expect(describeLoadError(new Error('boom'))).toEqual({
      heading: en.errors.loadFailedHeading,
      detail: 'boom',
    });
  });
});
