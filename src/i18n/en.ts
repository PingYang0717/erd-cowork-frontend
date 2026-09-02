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

  common: {
    cancel: 'Cancel',
    gotIt: 'Got it',
    retry: 'Retry',
  },

  artifact: {
    publishedTooltip: 'This version is published and available to others',
    published: 'Published',
    publish: 'Publish Artifact',
    share: 'Share',
    shareBlocked: 'Publish before sharing',
    reload: 'Reload',
    openInNewTab: 'Open preview in a new tab',
    missing:
      'This Artifact is no longer available — it may have been deleted. Pick another from the menu above.',
    publishedToast: 'Published — added to Artifacts on the left.',
    goToArtifacts: 'Go to Artifacts',
    switchVersion: 'Switch Artifact',
    versionMenuTitle: (count: number) =>
      `${count} Artifact${count === 1 ? '' : 's'} from this conversation · switch before publishing`,
  },

  publishDialog: {
    subtitle: 'Once published it appears in Artifacts and can be shared with the team.',
    nameLabel: 'Name',
    namePlaceholder: 'e.g. August A14 yield tracking',
    nameHint: 'This is the name it will be found by in the list.',
    publish: 'Publish',
  },

  gallery: {
    sortLabel: 'Sort:',
    sortPinned: 'Pinned first',
    sortRecent: 'Most recent',
    sortName: 'Name A→Z',
    emptyAll: 'No Artifacts yet.',
    emptyYours: 'You have not produced any Artifacts yet.',
    emptyShared: 'Nothing has been shared with you yet.',
    emptyPinned: 'You have not pinned any Artifacts yet.',
  },

  chat: {
    agentName: 'eRD AI',
    agentThinking: 'eRD AI is working…',
    agentStopped: 'eRD AI · stopped',
    stopped: '⏹ Generation stopped',
    networkError: '⚠ Connection lost — please send again',
    viewHtml: 'View HTML',
    htmlLive: 'HTML being written',
    htmlLabel: 'HTML',
    loading: 'Loading…',
    noSource: 'No source available for this version (could not load)',
    truncatedRows: (n: number) => `(first ${n} rows)`,
    manageConnections: 'Manage connections',
    selectedCount: (n: number) => `${n} selected`,
    filesExpired: (days: number) =>
      `Some files have been inactive for over ${days} days and their contents have been cleared. Remove the ones marked "Expired" below and upload them again to carry on.`,
    questionTitle: 'Analysis conditions',
    questionSubmit: 'Send',
    questionDisabledHint: 'Answer the questions above first',
  },

  repair: {
    detected: (count: number) =>
      `⚠ ${count} runtime error${count === 1 ? '' : 's'} in this Artifact`,
    repair: 'Repair',
    ignore: 'Ignore',
    repairing: 'Repairing…',
    filesExpired: 'The files have expired — this Artifact cannot be repaired',
    failed: 'Repair did not succeed',
    tryAgain: 'Try again',
  },

  files: {
    dropzoneLink: 'Click to choose',
    dropzoneRest: 'or drag files here',
    limits: (count: number, total: string) => `Up to ${count} files · ${total} in total`,
    expired: 'Expired',
    uploadFailed: 'Upload failed. Please try again.',
    onlySpreadsheets: 'Only .csv / .xlsx are supported',
    tooManyFiles: (count: number) => `Up to ${count} files`,
    tooLarge: (total: string) => `${total} in total`,
  },

  errors: {
    offlineHeading: 'Cannot reach the backend',
    offlineDetail: 'Check that the service is running, then retry.',
    loadFailedHeading: 'This section failed to load',
    loadFailedDetail: (status: number) =>
      `The server answered ${status}. Please try again shortly.`,
    offlineAction: 'Cannot reach the backend. Check that the service is running, then retry.',
    notReady: 'The backend is not ready yet. Please try again shortly.',
  },
};
