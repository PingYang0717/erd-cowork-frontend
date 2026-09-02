/** Declarative reading of API response bodies, at the api layer's edge.
 *
 *  Before this existed every caller defended for itself, to different standards:
 *  `listArtifactShares` raised on a non-list, `searchDirectory` raised on a missing
 *  envelope, `ResultTable` swallowed with `?? []`, and `listSessions` / `getConfig`
 *  checked nothing at all — so a backend that dropped `retentionDays` put the word
 *  "undefined" into a sentence shown to the user, and an `updatedAt` that arrived as
 *  a number crashed the session rail on `.localeCompare`.
 *
 *  A contract declares, per field, three things and nothing more:
 *
 *  - **presence** — a field with no `fallback` and no `optional` MUST be there;
 *  - **a fallback** — declaring one is declaring "the backend may not send this,
 *    and the screen can stand on this value instead";
 *  - **a lightweight kind** — `string` / `number` / `boolean` / `array` / `object`,
 *    enough to stop the three real crash shapes (a method called on the wrong type,
 *    a `.map` over a non-array, a "null" that arrived as `""`), and deliberately no
 *    more. Full schema validation would be a second copy of `types/api` that drifts;
 *    the single source of field types stays there (see ADR-0013).
 *
 *  What a contract MUST NOT do: rename a field, translate a value, or strip fields
 *  it does not know. The wire contract is verbatim (ADR-0003) — undeclared fields
 *  pass through untouched, and this layer never becomes a translation layer.
 *
 *  A violation of a required field raises `ResponseShapeError` rather than letting
 *  broken data leave the api layer: "this could not be read" and "this is empty"
 *  are different facts, and the second is the one a user would wrongly act on. */

export type FieldKind = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface FieldRule<Value> {
  kind: FieldKind;
  /** `null` is a legal value (e.g. `pinnedAt: string | null`). A nullable string
   *  additionally reads `""` as null: for the timestamp-shaped fields this covers,
   *  an empty string is a backend's way of saying "no value", and letting it
   *  through as a string is how "" once read as pinned. */
  nullable?: boolean;
  /** May be absent entirely; when present it is still kind-checked. For fields the
   *  wire genuinely does not promise (`DirectoryEntry`'s per-type fields). */
  optional?: boolean;
  /** Declares the field survivable: used when the field is absent, null (unless
   *  `nullable`), or fails its kind check. No `fallback` means required. */
  fallback?: Value;
  /** For arrays of objects: the contract each row is read through. */
  of?: Contract<object>;
}

/** Every field of `T` must be declared — adding a field to a wire type without
 *  deciding its rule here is a compile error, the same guarantee the i18n
 *  dictionary gives copy (ADR-0012). */
export interface Contract<T extends object> {
  /** What this response is on screen. Error messages carry it so a violation says
   *  which read broke, not just that one did. */
  label: string;
  fields: { [K in keyof T]-?: FieldRule<T[K]> };
}

export class ResponseShapeError extends Error {
  readonly label: string;

  constructor(label: string, detail: string) {
    super(`${label}: ${detail}`);
    this.name = 'ResponseShapeError';
    this.label = label;
  }
}

const matchesKind = (value: unknown, kind: FieldKind): boolean => {
  if (kind === 'array') {
    return Array.isArray(value);
  }
  if (kind === 'object') {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
  return typeof value === kind;
};

/** Reads one object through its contract. Raises on a missing or wrong-kind
 *  required field; fills declared fallbacks; passes undeclared fields through
 *  verbatim. */
export const readObject = <T extends object>(body: unknown, contract: Contract<T>): T => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ResponseShapeError(contract.label, 'the response body is not an object');
  }
  const record = body as Record<string, unknown>;
  // Undeclared fields ride along untouched (verbatim wire contract, ADR-0003).
  const result: Record<string, unknown> = { ...record };

  for (const [key, entry] of Object.entries(contract.fields)) {
    const rule = entry as FieldRule<unknown>;
    let value = record[key];

    if (rule.nullable && rule.kind === 'string' && value === '') {
      value = null;
    }

    const absent = value === undefined || (value === null && !rule.nullable);
    if (absent) {
      if ('fallback' in rule) {
        result[key] = rule.fallback;
        continue;
      }
      if (rule.optional) {
        delete result[key];
        continue;
      }
      throw new ResponseShapeError(contract.label, `required field \`${key}\` is missing`);
    }

    if (value === null) {
      result[key] = null;
      continue;
    }

    if (!matchesKind(value, rule.kind)) {
      if ('fallback' in rule) {
        // Survivable by declaration — but never silently: a swapped-in value that
        // nobody hears about is a screen wearing an answer the backend never gave.
        console.warn(
          `[eRD Cowork] ${contract.label}: field \`${key}\` is not a ${rule.kind}; using its declared fallback`,
        );
        result[key] = rule.fallback;
        continue;
      }
      throw new ResponseShapeError(contract.label, `field \`${key}\` is not a ${rule.kind}`);
    }

    result[key] =
      rule.kind === 'array' && rule.of
        ? (value as unknown[]).map((row, index) =>
            readObject(row, { ...rule.of!, label: `${contract.label} · \`${key}\`[${index}]` }),
          )
        : value;
  }

  return result as T;
};

/** Reads a list response: raises when the body is not a list at all — an empty list
 *  is an answer, a non-list is a failure to answer — then reads each row. One broken
 *  row fails the whole read: a list quietly missing rows reads as "that one is
 *  gone", which sends the user off to look for a deletion that never happened. */
export const readArray = <T extends object>(body: unknown, contract: Contract<T>): T[] => {
  if (!Array.isArray(body)) {
    throw new ResponseShapeError(contract.label, 'the response body is not a list');
  }
  return body.map((row, index) =>
    readObject(row, { ...contract, label: `${contract.label}[${index}]` }),
  );
};

/** Reads a list that travels inside an envelope (`{ content: [...] }`), unwrapping
 *  exactly one named key so nothing downstream knows the envelope existed. */
export const readArrayIn = <T extends object>(
  body: unknown,
  key: string,
  contract: Contract<T>,
): T[] => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ResponseShapeError(
      contract.label,
      `the response body is not an object carrying \`${key}\``,
    );
  }
  return readArray((body as Record<string, unknown>)[key], contract);
};

/** Curried forms for the endpoint modules' pipeline style:
 *
 *      export const listArtifacts = () =>
 *        apiClient.get('/artifacts').then(asArray(ARTIFACT));
 *
 *  The call site reads as one declarative line — fetch, then read through the
 *  contract — and the return type flows from the contract instead of from a
 *  `<unknown>` annotation the reader has to look past. The uncurried `read*`
 *  functions above stay exported for the places that read outside a promise chain
 *  (the agent stream's refusal body, the hook-level attempted read on shares). */
export const asObject =
  <T extends object>(contract: Contract<T>) =>
  (body: unknown): T =>
    readObject(body, contract);

export const asArray =
  <T extends object>(contract: Contract<T>) =>
  (body: unknown): T[] =>
    readArray(body, contract);

export const asArrayIn =
  <T extends object>(key: string, contract: Contract<T>) =>
  (body: unknown): T[] =>
    readArrayIn(body, key, contract);
