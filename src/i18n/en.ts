import type { Translations } from './zhTW';

/** The English copy. Typed against the Chinese one, so a string added there and not here
 *  fails the build rather than rendering as a blank once someone switches language. */
export const en: Translations = {
  share: {
    subtitle: 'This Artifact is published and ready to share.',
    recipientsLabel: 'Share with',
    recipientsHint:
      'Mix departments (A10INTD1-1), sections (INTD-1) and people (CHXXGHYC · 鄭凱宇)',
    unavailable: 'Could not load the current recipients. Please try again.',
    searchFailed: 'Search failed. Please try again.',
    searching: 'Searching…',
    noMatch: 'No match',
    minChars: (n) => `Type at least ${n} characters`,
    searchPlaceholder: (n) =>
      `Type ${n}+ characters to search departments, sections, NT accounts or names`,
    linkLabel: 'Share link',
    copy: 'Copy',
    copied: 'Copied',
    linkHint: 'Added to Artifacts on the left — open or share it again from there.',
    submit: 'Submit',
    title: 'Share Artifact',
    published: 'Published',
  },
};
