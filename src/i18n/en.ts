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
    loadFailed: 'This Artifact could not be loaded. Please try again shortly.',
    publishedToast: 'Published — added to Artifacts on the left.',
    goToArtifacts: 'Go to Artifacts',
    switchVersion: 'Switch Artifact',
    shareNotOwner: 'Only the owner can share this Artifact',
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

  session: {
    newChat: 'New chat',
    schedule: 'Schedule',
    artifacts: 'Artifacts',
    pinned: 'Pinned',
    recents: 'Recents',
    noRecents: 'No recent chats.',
    chatHistory: 'Chat history',
    pin: 'Pin',
    unpin: 'Unpin',
    rename: 'Rename',
    delete: 'Delete',
    deleteConfirmTitle: 'Delete this conversation?',
    deleteConfirmBody: (title: string) => `"${title}" will be removed from your list.`,
    deleteConfirm: 'Delete',
  },

  settings: {
    title: 'Settings',
    language: 'Language',
    languageZh: '中文',
    languageEn: 'English',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
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
    linkCopied: 'Link copied',
    linkCopyFailed: 'Could not copy the link — open Share to copy it by hand.',
    removeConfirmTitle: 'Remove from Artifacts?',
    removeConfirmBody: (title: string) =>
      `"${title}" will be unpublished and every recipient will lose access; it stays in the conversation that produced it.`,
    removeConfirm: 'Delete',
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
    noSource: 'No source available for this version',
    sourceLoadFailed: 'Could not load the source — please try again shortly',
    truncated: '(results truncated)',
    manageConnections: 'Manage connections',
    selectedCount: (n: number) => `${n} selected`,
    filesExpired: (days: number) =>
      `Some files have been inactive for over ${days} days and their contents have been cleared. Remove the ones marked "Expired" below and upload them again to carry on.`,
    questionTitle: 'Analysis conditions',
    questionSubmit: 'Send',
    questionDisabledHint: 'Answer the questions above first',
    uploadingWait: 'Files are still being processed — sending resumes once they finish',
    thinking: 'Thinking',
    workedThrough: (n: number) => `Worked through ${n} step${n === 1 ? '' : 's'}`,
    shownRight: 'shown right →',
    showRight: 'show right →',
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
    duplicateName: 'A file with the same name is already attached',
    processing: 'Server processing…',
  },

  time: {
    justNow: 'Just now',
    minutesAgo: (n: number) => `${n}m ago`,
    hoursAgo: (n: number) => `${n}h ago`,
    yesterday: 'Yesterday',
    weekday: (day: number) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
    monthDay: (month: number, date: number) =>
      `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month]} ${date}`,
    monthDayYear: (month: number, date: number, year: number) =>
      `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month]} ${date}, ${year}`,
  },

  connectors: {
    title: 'Connectors',
    subtitle: (connected: number, total: number) =>
      `Connect eRD AI to your RD data sources · ${connected} of ${total} connected.`,
    selectedSources: 'Selected sources',
    clearAll: 'Clear all',
    noneSelected: 'No sources selected yet — connect one below.',
    searchPlaceholder: 'Search data sources…',
    filterAll: 'All',
    filterConnected: 'Connected',
    filterNotConnected: 'Not Connected',
    showing: (shown: number, total: number) => `Showing ${shown} of ${total}`,
    submit: 'Submit',
    add: 'Add',
    addPlaceholder: 'Add a custom data source (e.g. My Team DB)…',
    noMatch: (keyword: string) => `No data sources match "${keyword}".`,
    statusConnecting: 'Connecting…',
    statusConnected: 'Connected',
    statusExpired: 'Token expired',
    statusNoAccess: 'No access',
    statusNotConnected: 'Not connected',
  },

  fileModal: {
    title: 'Attach files',
    subtitle: 'Drop or choose files to attach to this analysis.',
    attached: 'Attached',
    noFiles: 'No files yet',
    summary: (count: number, max: number, size: string) => `${count} / ${max} files · ${size}`,
    done: 'Done',
  },

  composer: {
    inlineDashboard: 'Inline dashboard',
    spcAnalysis: 'SPC analysis',
    generateSlides: 'Generate slides',
    dailyMonitor: 'Daily monitor (A14)',
    cpTestStatus: 'CP Test status',
    attachFiles: 'Attach files',
    connectors: 'Connectors',
    placeholder: 'Ask eRD AI, or attach .csv / .xlsx…',
  },

  studio: {
    emptyNoSessionHeading: 'Select or start a session',
    emptyNoSessionSubtitle: 'Start or select a session from the left to begin an analysis.',
    emptyStartHeading: 'Start an analysis',
    emptyStartSubtitle: 'Try "Daily monitor (A14)" below, or ask for an SPC analysis on Vt.',
    artifactEmptyHeading: 'No artifact yet',
    artifactEmptySubtitle: 'Ask eRD AI to run an analysis — the Artifact renders here.',
    back: 'Back',
    home: 'Home',
    sharedToMe: 'Shared to me',
    artifactNotFound: 'Artifact not found.',
  },

  galleryHeader: {
    title: 'Artifacts',
    subtitle: 'Every Artifact eRD Cowork has produced — click to open it.',
    filterAll: 'All',
    filterYours: 'Yours',
    filterShared: 'Shared to me',
    filterPinned: 'Pinned',
    sharedBadge: 'Shared',
    sharedToMe: 'Shared to me',
    copyLink: 'Copy link',
    share: 'Share',
    delete: 'Delete',
    pin: 'Pin',
    unpin: 'Unpin',
  },

  errors: {
    offlineHeading: 'Cannot reach the backend',
    offlineDetail: 'Check that the service is running, then retry.',
    loadFailedHeading: 'This section failed to load',
    loadFailedDetail: (status: number) =>
      `The server answered ${status}. Please try again shortly.`,
    offlineAction: 'Cannot reach the backend. Check that the service is running, then retry.',
    notReady: 'The backend is not ready yet. Please try again shortly.',
    actionFailed: 'That did not go through. Please try again shortly.',
    actionFailedWithStatus: (status: number) =>
      `That did not go through (the server answered ${status}). Please try again shortly.`,
  },
};
