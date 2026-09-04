import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/en';
import { describeActionError, describeLoadError } from './describeLoadError';

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

  /** The backend's own words win, the same rule describeActionError follows. Skipped
   *  here, a load that failed with a reason attached was reported as a bare number —
   *  `伺服器回應 403` where the backend had already written "no access to this session". */
  it('shows the reason the backend gave, in preference to its status code', () => {
    const refused = axiosError('ERR_BAD_REQUEST', {
      status: 403,
      statusText: 'Forbidden',
      data: { message: '沒有這個 session 的存取權' },
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    });

    expect(describeLoadError(refused)).toEqual({
      heading: en.errors.loadFailedHeading,
      detail: '沒有這個 session 的存取權',
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

describe('describeActionError', () => {
  /** The backend's own words win: it is the only party that knows what went wrong. */
  it('passes the backend message through', () => {
    expect(
      describeActionError(
        axiosError('ERR', {
          status: 400,
          statusText: '',
          data: { message: '配額已滿' },
          headers: new AxiosHeaders(),
          config: { headers: new AxiosHeaders() },
        })
      )
    ).toBe('配額已滿');
  });

  /** 404 is the one status that means "no such endpoint", which is what this wording is
   *  actually about. */
  it('keeps "not ready yet" for a status that means the endpoint is absent', () => {
    expect(
      describeActionError(
        axiosError('ERR', {
          status: 404,
          statusText: '',
          data: null,
          headers: new AxiosHeaders(),
          config: { headers: new AxiosHeaders() },
        })
      )
    ).toBe(en.errors.notReady);
  });

  /** Everything else used to be told the same thing. A 500 is a server error on an
   *  endpoint that plainly exists; a 403 is a refusal. Neither is "not built yet". */
  it('does not call a server error an unbuilt endpoint', () => {
    const answered = describeActionError(
      axiosError('ERR', {
        status: 500,
        statusText: '',
        data: null,
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      })
    );
    expect(answered).toBe(en.errors.actionFailedWithStatus(500));
    expect(answered).not.toBe(en.errors.notReady);
  });
});
