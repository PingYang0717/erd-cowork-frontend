import { describe, expect, it } from 'vitest';

import { en } from './en';
import { zhTW } from './zhTW';

/** Guards the half the type system cannot.
 *
 *  `en` is typed against `zhTW`, so a code added to one dictionary and not the other is a
 *  compile error. What compiles perfectly is a code the **backend** sends that neither
 *  dictionary has ever heard of: it degrades to the generic sentence and nothing says so
 *  until a user reports that an error message was unhelpful. `describeErrorCode` warns in
 *  development; this is the same gap caught at build time, against the contract rather
 *  than against whatever happened to be exercised.
 *
 *  Update this list from `docs/api/interface.md` when the backend adds a code.
 */
const CODES_WITH_COPY = ['CONFLICT', 'FILES_EXPIRED', 'PARSE_ERROR', 'UPLOAD_LIMIT', 'UNSUPPORTED_TYPE'] as const;

/** The 403 codes deliberately have no entry. `AccessDeniedGate` shows the backend's own
 *  sentence, because only it knows which resource or which entitlement was refused — this
 *  client has no copy that could say it. An entry here would be a second, vaguer answer
 *  competing with the right one. */
const CODES_HANDLED_ELSEWHERE = ['ACCESS_DENIED', 'ENTITLEMENT_DENIED'] as const;

describe('backend error codes', () => {
  it.each(CODES_WITH_COPY)('has copy in both dictionaries for %s', (code) => {
    expect(zhTW.errors.byCode[code]).toBeDefined();
    expect(en.errors.byCode[code]).toBeDefined();
  });

  it('leaves the refusal codes to the access-denied gate', () => {
    for (const code of CODES_HANDLED_ELSEWHERE) {
      expect(code in zhTW.errors.byCode).toBe(false);
      expect(code in en.errors.byCode).toBe(false);
    }
  });

  /** Both dictionaries answer for exactly the same set. A code entered in one and not the
   *  other is already a compile error; this catches the reverse mistake of an entry left
   *  behind in a dictionary after the list above moved on. */
  it('carries no entry the list above does not claim', () => {
    expect(Object.keys(zhTW.errors.byCode).sort()).toEqual([...CODES_WITH_COPY].sort());
    expect(Object.keys(en.errors.byCode).sort()).toEqual([...CODES_WITH_COPY].sort());
  });
});
