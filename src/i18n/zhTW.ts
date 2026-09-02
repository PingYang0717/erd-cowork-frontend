/** The Chinese copy, and the shape every other language is checked against.
 *
 *  Nested objects rather than dotted string keys: reaching a string is `t.share.published`,
 *  which autocompletes and cannot be mistyped — there is no key to get wrong. A string
 *  that takes a value is a function rather than a placeholder template, so a translation
 *  is free to put the value wherever its own grammar wants it (`最多 5 個檔案` against
 *  `Up to 5 files`).
 *
 *  Product nouns stay in English throughout — Artifact, Session, Scenario, Studio. They
 *  are the names the team says out loud and the ones CONTEXT.md fixes; translating them
 *  would invent a second vocabulary for things that already have one.
 */
export const zhTW = {
  share: {
    /** The dialog's own subtitle, above the recipient picker. */
    subtitle: 'Artifact 已發布,可分享給團隊檢視。',
    recipientsLabel: '分享對象',
    recipientsHint: '可混選部門(A10INTD1-1)、課別(INTD-1)與人員(CHXXGHYC · 鄭凱宇)',
    /** The list could not be read — deliberately not "shared with nobody", which is a
     *  different fact and the one a user would act on. */
    unavailable: '讀不到目前的分享對象,請稍後再試。',
    searchFailed: '搜尋失敗,請稍後再試',
    searching: '搜尋中…',
    noMatch: '找不到符合的對象',
    minChars: (n: number) => `請至少輸入 ${n} 個字元`,
    searchPlaceholder: (n: number) => `輸入 ${n} 個字元以上搜尋部門 / 課別 或 NT account · 姓名`,
    linkLabel: '分享連結',
    copy: '複製',
    copied: '已複製',
    linkHint: '已加入左側 Artifacts 清單 — 可到 Artifacts 開啟或再次分享。',
    submit: 'Submit',
    title: '分享 Artifact',
    published: '已發布',
  },

  /** Words that appear in more than one place and mean the same thing in each. */
  common: {
    cancel: '取消',
    gotIt: '知道了',
    retry: '重試',
  },

  artifact: {
    publishedTooltip: '此版本已發布，其他人可以使用',
    published: '已發布',
    publish: '發布 Artifact',
    share: '分享',
    shareBlocked: '發布後才能分享',
    reload: '重新整理',
    openInNewTab: '在新分頁開啟預覽',
    /** Shown for any failure to load the document, which is why it hedges. */
    missing: '這個 Artifact 已不存在,可能已被刪除。請從上方選單挑選其他產出。',
    publishedToast: '已發布 — 已加入左側 Artifacts 清單。',
    goToArtifacts: '前往 Artifacts',
    switchVersion: '切換產出',
    versionMenuTitle: (count: number) => `此對話的產出 · 共 ${count} 個，可切換後再發布`,
  },

  publishDialog: {
    subtitle: '發布後會出現在 Artifacts 清單,並可分享給團隊檢視。',
    nameLabel: '名稱',
    namePlaceholder: '例如:8 月 A14 良率追蹤',
    nameHint: '清單上就是用這個名稱找到它。',
    publish: '發布',
  },

  gallery: {
    sortLabel: '排序:',
    sortPinned: '釘選優先',
    sortRecent: '最近建立',
    sortName: '名稱 A→Z',
    emptyAll: '目前還沒有 Artifact。',
    emptyYours: '你還沒有生成任何 Artifact。',
    emptyShared: '目前沒有分享給你的 Artifact。',
    emptyPinned: '你還沒有釘選任何 Artifact。',
  },

  chat: {
    /** The product's own name, unchanged in either language. */
    agentName: 'eRD AI',
    agentThinking: 'eRD AI 處理中…',
    agentStopped: 'eRD AI · 已停止',
    stopped: '⏹ 已停止生成',
    networkError: '⚠ 連線中斷，請重新送出一次',
    viewHtml: '查看 HTML',
    htmlLive: '產生中的 HTML',
    htmlLabel: 'HTML',
    loading: '載入中…',
    noSource: '此版本無原始碼可檢視（無法載入）',
    truncatedRows: (n: number) => `(前 ${n} 列)`,
    manageConnections: '管理連線',
    selectedCount: (n: number) => `已選 ${n} 項`,
    filesExpired: (days: number) =>
      `部分檔案已超過 ${days} 天未活動，內容已被系統清除。請移除下方標示「已過期」的檔案並重新上傳，即可繼續對話。`,
    /** Fallbacks for a question form the backend sent without its own labels. */
    questionTitle: '分析條件',
    questionSubmit: '送出',
    questionDisabledHint: '請先回答上面的問題',
  },

  repair: {
    detected: (count: number) => `⚠ 偵測到儀表板執行錯誤（${count} 個）`,
    repair: '修復',
    ignore: '忽略',
    repairing: '修復中，請稍候…',
    filesExpired: '檔案已過期，無法修復此儀表板',
    failed: '修復未成功',
    tryAgain: '再試一次',
  },

  files: {
    dropzoneLink: '點擊選擇',
    dropzoneRest: '或把檔案拖拉到這裡',
    limits: (count: number, total: string) => `最多 ${count} 個檔案 · 總計上限 ${total}`,
    expired: '已過期',
    uploadFailed: '上傳失敗，請再試一次。',
    onlySpreadsheets: '僅支援 .csv / .xlsx',
    tooManyFiles: (count: number) => `最多 ${count} 個檔案`,
    tooLarge: (total: string) => `總計上限 ${total}`,
  },

  errors: {
    offlineHeading: '無法連線到後端服務',
    offlineDetail: '請確認服務已啟動後重試。',
    loadFailedHeading: '這個區塊載入失敗',
    /** Actions get one sentence rather than a heading and a detail — a toast has no room
     *  for two. */
    offlineAction: '無法連線到後端服務，請確認服務已啟動後重試。',
    notReady: '後端尚未就緒，請稍後再試。',
  },
} as const;

/** Widens what `as const` narrowed. Without this every entry's type would be the Chinese
 *  string itself, and the English copy could only satisfy it by repeating the Chinese.
 *  Functions keep their parameter list, so a translation cannot quietly take fewer
 *  arguments than the call site passes. */
type SameShape<T> = T extends (...args: infer Args) => string ? (...args: Args) => string : string;

/** What every other language must supply. Derived from `zhTW` rather than hand-written:
 *  adding a string to the Chinese copy is what makes the English one incomplete, and it
 *  should be the same edit that says so — the build fails until both exist. */
export type Translations = {
  [Section in keyof typeof zhTW]: {
    [Key in keyof (typeof zhTW)[Section]]: SameShape<(typeof zhTW)[Section][Key]>;
  };
};
