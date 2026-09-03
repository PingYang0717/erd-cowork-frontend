import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

/** Guards the dictionary's completeness the type system cannot: ADR-0012's "a missed
 *  translation is a compile error" holds only for strings that ever entered the
 *  dictionary — a hardcoded literal in JSX compiles perfectly in both languages and
 *  simply never translates. This walks the components and pages for the shapes those
 *  literals take: an English JSX text node, and English `label:` / `placeholder=`
 *  values. `aria-label` and `title` are exempt by decision (ADR-0012): always English,
 *  548 test call sites locate elements by them.
 *
 *  The matcher is a heuristic, deliberately narrow; anything it cannot judge lands in
 *  ALLOWED with a reason rather than in a looser regex. */

/** file → substrings that are allowed to stay literal, each with its reason. */
const ALLOWED: Record<string, string[]> = {
  // The message SENT to the backend — its scenario inference answers to this English
  // keyword vocabulary; only the chip's visible label follows the language.
  'components/chat/ChatComposer.tsx': [
    'Generate an Inline dashboard.',
    'Run an SPC analysis on Vt (gate CD).',
    'Generate slides from this analysis.',
    'Generate the Daily Monitor dashboard for A14.',
    'What is the CP Test status?',
  ],
  // Product name, not copy (same reasoning as the dictionary's own `eRD AI`).
  'components/chat/ThreadPanel.tsx': ['Cowork · Data studio'],
  // Wire-format labels the backend defines, compared byte-for-byte.
  'components/chat/StepList.tsx': ['Pending', 'Running', 'Done', 'Failed'],
  // Filter identity keys — what the user reads is looked up per key at render time.
  'components/connectors/ConnectorsPanel.tsx': ['All', 'Connected', 'Not Connected'],
};

const SRC = join(__dirname, '..');

const tsxFilesUnder = (dir: string): string[] => {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return tsxFilesUnder(path);
    }
    return entry.name.endsWith('.tsx') && !entry.name.includes('.test.') ? [path] : [];
  });
};

/** A JSX text node that looks like an English sentence fragment: starts with a letter
 *  and contains at least one lowercase word of 2+ letters. Punctuation-only nodes,
 *  interpolations and single glyphs pass. */
const JSX_TEXT = />\s*([A-Z][^<>{}]*[a-z]{2}[^<>{}]*)</g;
/** `label: '…'` (menu-item objects) and `placeholder="…"` carry visible copy. The JSX
 *  attribute form `label="…"` is deliberately NOT matched: the two components that take
 *  it (DataBoundary, ResizeHandle) route it to `aria-label`, which is exempt. */
const ATTR_TEXT = /(?:label:\s*|placeholder=)["']([A-Z][^"']*[a-z]{2}[^"']*)["']/g;

const violationsIn = (source: string, relative: string): string[] => {
  const allowed = ALLOWED[relative] ?? [];
  const found: string[] = [];
  for (const pattern of [JSX_TEXT, ATTR_TEXT]) {
    const regex = new RegExp(pattern.source, 'g');
    let match = regex.exec(source);
    while (match !== null) {
      const text = match[1].trim();
      if (text.length > 0 && !allowed.some((entry) => text.includes(entry))) {
        found.push(text);
      }
      match = regex.exec(source);
    }
  }
  return found;
};

describe('UI copy goes through the dictionary', () => {
  it('finds no bare English literals in components and pages', () => {
    const files = [...tsxFilesUnder(join(SRC, 'components')), ...tsxFilesUnder(join(SRC, 'pages'))];
    const report: Record<string, string[]> = {};

    for (const file of files) {
      // path.relative + separator normalisation, NOT a string slice: slicing by
      // SRC.length broke the moment the two paths disagreed about anything the
      // length can't see (Windows separators, a symlinked or differently-cased
      // checkout) — the key then missed ALLOWED and legitimate entries like the
      // product name in ThreadPanel read as violations.
      const relativePath = relative(SRC, file).split(sep).join('/');
      // aria-label / title lines are exempt (ADR-0012); strip them before matching.
      const source = readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => !/aria-label|title=|aria-labelledby/.test(line))
        .join('\n');
      const found = violationsIn(source, relativePath);
      if (found.length > 0) {
        report[relativePath] = found;
      }
    }

    expect(report).toEqual({});
  });
});
