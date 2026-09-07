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

  /** A card has room for two lines, so it can do what a toast cannot: lead with a sentence
   *  the reader can act on, and still keep the backend's own words. They go underneath as
   *  small print — useful to whoever gets the screenshot, never the main claim. */
  it("leads with this app's sentence for the code and keeps the backend's underneath", () => {
    const expired = axiosError('ERR_BAD_REQUEST', {
      status: 409,
      statusText: 'Conflict',
      data: { code: 'FILES_EXPIRED', message: 'session files purged by retention job' },
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    });

    expect(describeLoadError(expired)).toEqual({
      heading: en.errors.loadFailedHeading,
      detail: en.errors.byCode.FILES_EXPIRED(null),
      technical: 'session files purged by retention job',
    });
  });

  /** Without a code there is nothing to look up, so the status is the main line — but the
   *  backend's sentence is still worth keeping where someone debugging can read it. */
  it('keeps the backend sentence as small print even when it has no code to go with it', () => {
    const refused = axiosError('ERR_BAD_REQUEST', {
      status: 500,
      statusText: '',
      data: { message: 'NullPointerException at SessionService.java:214' },
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    });

    expect(describeLoadError(refused)).toEqual({
      heading: en.errors.loadFailedHeading,
      detail: en.errors.loadFailedDetail(500),
      technical: 'NullPointerException at SessionService.java:214',
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
  /** The code decides the sentence, not the message beside it. The backend names a
   *  failure in its own terms — a duplicate-key violation here — which is the right
   *  vocabulary for a server log and the wrong one for a toast. */
  it("prefers this app's sentence for the code over the backend's message", () => {
    const conflict = describeActionError(
      axiosError('ERR', {
        status: 409,
        statusText: '',
        data: { code: 'CONFLICT', message: 'E11000 duplicate key error collection: erd.sessions' },
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      })
    );

    expect(conflict).toBe(en.errors.byCode.CONFLICT);
    expect(conflict).not.toContain('E11000');
  });

  /** A message with no code beside it has nothing this app can map, and a toast is one
   *  line — there is no room to show a generic sentence AND the backend's. The backend's
   *  words used to win here outright; that is what put untranslated server prose in front
   *  of users, which is the whole reason for the code table. */
  it('gives its own generic sentence when the failure carried no code', () => {
    const uncoded = describeActionError(
      axiosError('ERR', {
        status: 400,
        statusText: '',
        data: { message: 'Constraint violation on column quota_bytes' },
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      })
    );

    expect(uncoded).toBe(en.errors.actionFailedWithStatus(400));
    expect(uncoded).not.toContain('quota_bytes');
  });

  /** 404 used to mean "this endpoint is not built yet" — true while endpoints were
   *  landing, and false now that they all have. Deleting an already-deleted Session
   *  answered 404 and was reported as the backend not being ready, which is a claim about
   *  the wrong thing and one a user acts on by waiting for something already there.
   *
   *  Only the caller knows what was missing, so only the caller can name it. 501 keeps the
   *  old wording: that status really does mean "not implemented". */
  it('lets the caller name what was missing, rather than calling it an unbuilt endpoint', () => {
    const notFound = axiosError('ERR', {
      status: 404,
      statusText: '',
      data: null,
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    });

    expect(describeActionError(notFound, 'This Session has already been deleted.')).toBe(
      'This Session has already been deleted.'
    );
    expect(describeActionError(notFound)).toBe(en.errors.noLongerExists);
    expect(describeActionError(notFound)).not.toBe(en.errors.notReady);
  });

  /** 501 is the status that actually says "not implemented", so it keeps the wording 404
   *  borrowed. */
  it('keeps "not ready yet" for the status that really means unimplemented', () => {
    expect(
      describeActionError(
        axiosError('ERR', {
          status: 501,
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
