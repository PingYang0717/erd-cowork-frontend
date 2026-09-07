import { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { en } from '@/i18n/en';
import { copyForCode, describeErrorCode } from './describeErrorCode';

const axiosErrorWith = (status: number, data: unknown): AxiosError =>
  new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data,
  });

afterEach(() => vi.restoreAllMocks());

/** The agent stream's ERROR event carries a bare `{ code, message }` rather than a thrown
 *  error, so the lookup is exported on its own for it. */
describe('copyForCode', () => {
  it('answers for a code it knows, and null for one it does not', () => {
    expect(copyForCode('CONFLICT')).toBe(en.errors.byCode.CONFLICT);
    expect(copyForCode('SCENARIO_TIMEOUT')).toBeNull();
  });
});

describe('describeErrorCode', () => {
  /** The backend's sentence for a duplicate key is a database error read aloud. The code
   *  beside it is the part this app can act on: it knows what a conflict means here and
   *  can say it in a way the reader can do something about. */
  it("answers with this app's own sentence rather than the backend's", () => {
    const conflict = axiosErrorWith(409, {
      code: 'CONFLICT',
      message: 'E11000 duplicate key error collection: erd.sessions index: name_1',
    });

    expect(describeErrorCode(conflict)).toBe(en.errors.byCode.CONFLICT);
    expect(describeErrorCode(conflict)).not.toContain('E11000');
  });

  /** A code this app has no sentence for is the expected case, not the exceptional one:
   *  the backend will grow codes faster than this dictionary does. Answering null hands
   *  the decision back to the caller, which knows whether it has a toast, a card or a
   *  whole pane to fill. */
  it('answers null for a code it has no sentence for, and for no code at all', () => {
    expect(describeErrorCode(axiosErrorWith(500, { code: 'SOMETHING_NEW', message: 'boom' }))).toBeNull();
    expect(describeErrorCode(axiosErrorWith(500, { message: 'boom' }))).toBeNull();
    expect(describeErrorCode(new Error('boom'))).toBeNull();
  });

  /** The upload codes all arrive as a 400 with a parser or validator sentence attached —
   *  "Unexpected token at row 1", "extension not in whitelist". Each names a different
   *  thing the user can do about it, and none of them is what the backend wrote. */
  it.each([
    ['PARSE_ERROR', 'Unexpected token at line 1 column 3'],
    ['UPLOAD_LIMIT', 'total 6442450944 exceeds maxSessionBytes'],
    ['UNSUPPORTED_TYPE', 'extension .pdf not in whitelist'],
  ])('has a sentence of its own for %s', (code, backendMessage) => {
    const copy = describeErrorCode(axiosErrorWith(400, { code, message: backendMessage }));

    expect(copy).toBe(en.errors.byCode[code as 'PARSE_ERROR']);
    expect(copy).not.toBe(backendMessage);
  });

  /** The retention period is a deployment fact the backend publishes (`GET /config`), not
   *  a number this app gets to assert — ChatComposer already states it from there. A
   *  caller that cannot reach it (a plain function, outside React) gets a sentence with
   *  no number rather than one reading "over undefined days". */
  it('names the retention period when the caller knows it, and omits it when not', () => {
    const expired = axiosErrorWith(409, { code: 'FILES_EXPIRED', message: 'files purged' });

    expect(describeErrorCode(expired, { retentionDays: 30 })).toBe(en.errors.byCode.FILES_EXPIRED(30));
    expect(describeErrorCode(expired, { retentionDays: 30 })).toContain('30');
    expect(describeErrorCode(expired)).toBe(en.errors.byCode.FILES_EXPIRED(null));
    expect(describeErrorCode(expired)).not.toContain('undefined');
  });

  /** The failure mode this guards is silence: the backend adds a code, every user gets
   *  the generic sentence, and nothing anywhere says the dictionary fell behind. The
   *  warning carries the backend's own message because that is the only description of
   *  the new code anyone has until someone writes one. */
  it('says out loud, in development, that a code went unrecognised', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    describeErrorCode(axiosErrorWith(500, { code: 'SOMETHING_NEW', message: 'quota exhausted' }));

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.join(' ')).toContain('SOMETHING_NEW');
    expect(warn.mock.calls[0]?.join(' ')).toContain('quota exhausted');
  });

  /** A failure with no code is not the dictionary falling behind — it is a transport
   *  error, a render error, a backend that answered with nothing. Warning on those makes
   *  the warning worthless. */
  it('stays quiet when there was no code to recognise', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    describeErrorCode(axiosErrorWith(500, { message: 'boom' }));
    describeErrorCode(new Error('boom'));

    expect(warn).not.toHaveBeenCalled();
  });
});
