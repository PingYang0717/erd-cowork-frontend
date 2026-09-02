import { describe, expect, it, vi } from 'vitest';

import {
  type Contract,
  readArray,
  readArrayIn,
  readObject,
  ResponseShapeError,
} from './responseContract';

interface Row {
  id: string;
  count: number;
  pinnedAt: string | null;
  note?: string;
  isOwn: boolean;
}

const ROW: Contract<Row> = {
  label: 'the row',
  fields: {
    id: { kind: 'string' },
    count: { kind: 'number' },
    pinnedAt: { kind: 'string', nullable: true, fallback: null },
    note: { kind: 'string', optional: true },
    isOwn: { kind: 'boolean', fallback: false },
  },
};

describe('readObject', () => {
  it('passes a conforming body through, extra fields included', () => {
    const body = { id: 'a', count: 2, pinnedAt: '2026-01-01', isOwn: true, extra: 'kept' };
    // Undeclared fields ride along verbatim (ADR-0003) — the contract narrows, it
    // never strips.
    expect(readObject(body, ROW)).toEqual(body);
  });

  it('raises on a missing required field, naming the read and the field', () => {
    expect(() => readObject({ count: 2 }, ROW)).toThrowError(
      /the row: required field `id` is missing/,
    );
  });

  it('raises when a required field arrives as the wrong kind', () => {
    // The crash shape this exists for: `.localeCompare` on a number, `.map` on an
    // object — caught here rather than mid-render.
    expect(() => readObject({ id: 'a', count: 'two', isOwn: true }, ROW)).toThrowError(
      ResponseShapeError,
    );
  });

  it('fills a declared fallback for an absent field', () => {
    expect(readObject({ id: 'a', count: 1 }, ROW)).toMatchObject({ isOwn: false, pinnedAt: null });
  });

  it('falls back — loudly — when a survivable field arrives as the wrong kind', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(readObject({ id: 'a', count: 1, isOwn: 'yes' }, ROW)).toMatchObject({ isOwn: false });
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('reads an empty string on a nullable string field as null', () => {
    // "" is a backend's way of saying "no value" on a timestamp-shaped field;
    // letting it through as a string is how "" once read as pinned.
    expect(readObject({ id: 'a', count: 1, pinnedAt: '' }, ROW)).toMatchObject({ pinnedAt: null });
  });

  it('leaves an optional field absent rather than inventing it', () => {
    expect('note' in readObject({ id: 'a', count: 1 }, ROW)).toBe(false);
  });

  it('raises on a body that is not an object at all', () => {
    expect(() => readObject([], ROW)).toThrowError(/not an object/);
    expect(() => readObject('nope', ROW)).toThrowError(/not an object/);
  });
});

interface Parent {
  rows: Row[];
}

const PARENT: Contract<Parent> = {
  label: 'the parent',
  fields: { rows: { kind: 'array', of: ROW } },
};

describe('readArray', () => {
  it('reads each row through the row contract', () => {
    expect(readArray([{ id: 'a', count: 1 }], ROW)[0]).toMatchObject({ id: 'a', isOwn: false });
  });

  it('raises on a non-list — an empty list is an answer, a non-list is not', () => {
    expect(() => readArray({ message: 'oops' }, ROW)).toThrowError(/not a list/);
  });

  it('fails the whole read on one broken row, naming its index', () => {
    // A list quietly missing rows reads as "that one is gone" — a deletion that
    // never happened.
    expect(() => readArray([{ id: 'a', count: 1 }, { count: 2 }], ROW)).toThrowError(
      /the row\[1\]/,
    );
  });
});

describe('nested rows and envelopes', () => {
  it('reads nested array rows through their own contract', () => {
    expect(() => readObject({ rows: [{ count: 1 }] }, PARENT)).toThrowError(/`rows`\[0\]/);
  });

  it('unwraps a named envelope key', () => {
    expect(readArrayIn({ content: [{ id: 'a', count: 1 }] }, 'content', ROW)).toHaveLength(1);
    expect(() => readArrayIn({ other: [] }, 'content', ROW)).toThrowError(/not a list/);
    expect(() => readArrayIn(null, 'content', ROW)).toThrowError(/carrying `content`/);
  });
});
