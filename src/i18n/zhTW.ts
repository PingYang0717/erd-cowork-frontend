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
    missing: '這個 Artifact 已不存在,可能已被刪除。請從上方選單挑選其他 Artifact。',
    /** Said when the load failed for a reason that is not "gone" — the Artifact may be
     *  perfectly fine and the request simply did not get through. */
    loadFailed: '這個 Artifact 載入失敗,請稍後重試。',
    publishedToast: '已發布 — 已加入左側 Artifacts 清單。',
    goToArtifacts: '前往 Artifacts',
    /** Artifact, not 產出. The version menu deliberately avoids 「版本」 — these are
     *  siblings, not a chain (artifact-model-decisions Q2) — but that decision was about
     *  not implying a lineage, not about coining a second name for the thing itself. */
    switchVersion: '切換 Artifact',
    /** 個人副本不能再往下分享——分享只有原擁有者做得到(CONTEXT.md)。 */
    shareNotOwner: '只有原擁有者可以分享',
    versionMenuTitle: (count: number) => `此對話的 Artifact · 共 ${count} 個，可切換後再發布`,
  },

  publishDialog: {
    subtitle: '發布後會出現在 Artifacts 清單,並可分享給團隊檢視。',
    nameLabel: '名稱',
    namePlaceholder: '例如:8 月 A14 良率追蹤',
    nameHint: '清單上就是用這個名稱找到它。',
    publish: '發布',
  },

  /** The session rail's own words. */
  session: {
    newChat: '開新對話',
    schedule: '排程',
    artifacts: 'Artifacts',
    pinned: '釘選',
    recents: '最近',
    noRecents: '沒有最近的對話。',
    chatHistory: '對話紀錄',
    pin: '釘選',
    unpin: '取消釘選',
    rename: '重新命名',
    delete: '刪除',
    deleteConfirmTitle: '刪除這段對話？',
    deleteConfirmBody: (title: string) => `「${title}」會從清單中移除。`,
    deleteConfirm: '刪除',
  },

  settings: {
    /** The rail entry and the panel it opens share a name — pressing the thing called
     *  Settings should land you somewhere called Settings. */
    title: '設定',
    language: '語言',
    /** Each language names itself. A reader who cannot read the current interface still
     *  has to find their own — so this is the one place a language is not translated. */
    languageZh: '中文',
    languageEn: 'English',
    theme: '主題',
    themeLight: '淺色',
    themeDark: '深色',
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
    linkCopied: '已複製連結',
    linkCopyFailed: '無法複製連結，請開啟分享視窗手動複製。',
    /** 對使用者而言是刪除(卡片消失);底下是取消發布,並收回分享對象的存取權——
     *  後果溢出到別人身上,所以動作前先問。 */
    removeConfirmTitle: '從 Artifacts 移除？',
    removeConfirmBody: (title: string) =>
      `「${title}」會取消發布，所有分享對象都將失去存取權；它仍會留在產生它的對話中。`,
    removeConfirm: '刪除',
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
    /** TABLE 只送 truncated: boolean,不送筆數——所以這裡不報數字(後端待辦:
     *  希望 TABLE 帶 rowLimit)。 */
    truncated: '(結果已截斷)',
    manageConnections: '管理連線',
    selectedCount: (n: number) => `已選 ${n} 項`,
    filesExpired: (days: number) =>
      `部分檔案已超過 ${days} 天未活動，內容已被系統清除。請移除下方標示「已過期」的檔案並重新上傳，即可繼續對話。`,
    /** Fallbacks for a question form the backend sent without its own labels. */
    questionTitle: '分析條件',
    questionSubmit: '送出',
    questionDisabledHint: '請先回答上面的問題',
    /** 檔案集合還在變動時說明為何不能送——輸入框仍可打字,只有送出被擋。 */
    uploadingWait: '檔案處理中，完成後即可送出',
    thinking: '思考過程',
    workedThrough: (n: number) => `共執行 ${n} 個步驟`,
    shownRight: '已顯示於右側 →',
    showRight: '顯示於右側 →',
  },

  repair: {
    /** Artifact rather than 儀表板: `Artifact.type` is not in the contract, so this
     *  client cannot know whether the thing that threw is a dashboard or a deck. The
     *  backend's own repair records still say 儀表板 and land in the same thread — a
     *  wording gap noted for the backend, and better than asserting a kind we do not
     *  have. */
    detected: (count: number) => `⚠ 偵測到 Artifact 執行錯誤（${count} 個）`,
    repair: '修復',
    ignore: '忽略',
    repairing: '修復中，請稍候…',
    filesExpired: '檔案已過期，無法修復此 Artifact',
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
    duplicateName: '已附加過同名檔案',
    /** 位元組送完之後、後端回應之前的那段等待。進度條停在 90% 是誠實的——
     *  後端還要多久前端無從得知,不編一條會動的進度。 */
    processing: '伺服器處理中…',
  },

  /** Relative timestamps. Weekday/month tables live in the dictionary because they
   *  differ by language; `formatRelativeTime` reads them at call time. */
  time: {
    justNow: '剛剛',
    minutesAgo: (n: number) => `${n} 分鐘前`,
    hoursAgo: (n: number) => `${n} 小時前`,
    yesterday: '昨天',
    weekday: (day: number) => ['週日', '週一', '週二', '週三', '週四', '週五', '週六'][day],
    monthDay: (month: number, date: number) => `${month + 1} 月 ${date} 日`,
    monthDayYear: (month: number, date: number, year: number) =>
      `${year} 年 ${month + 1} 月 ${date} 日`,
  },

  connectors: {
    title: 'Connectors',
    subtitle: (connected: number, total: number) =>
      `把 eRD AI 連上你的 RD 資料來源 · ${total} 個中已連線 ${connected} 個。`,
    selectedSources: '已選來源',
    clearAll: '全部清除',
    noneSelected: '尚未選擇任何來源 — 從下方連一個。',
    searchPlaceholder: '搜尋資料來源…',
    filterAll: '全部',
    filterConnected: '已連線',
    filterNotConnected: '未連線',
    showing: (shown: number, total: number) => `顯示 ${shown} / ${total}`,
    submit: '送出',
    add: '新增',
    addPlaceholder: '新增自訂資料來源（例如 My Team DB）…',
    noMatch: (keyword: string) => `沒有符合「${keyword}」的資料來源。`,
    statusConnecting: '連線中…',
    statusConnected: '已連線',
    statusExpired: 'Token 已過期',
    statusNoAccess: '無權限',
    statusNotConnected: '未連線',
  },

  fileModal: {
    title: '附加檔案',
    subtitle: '拖放或選擇要附加到這次分析的檔案。',
    attached: '已附加',
    noFiles: '尚無檔案',
    summary: (count: number, max: number, size: string) => `${count} / ${max} 個檔案 · ${size}`,
    done: '完成',
  },

  composer: {
    inlineDashboard: 'Inline dashboard',
    spcAnalysis: 'SPC 分析',
    generateSlides: '產生投影片',
    dailyMonitor: 'Daily monitor（A14）',
    cpTestStatus: 'CP Test 狀態',
    attachFiles: '附加檔案',
    connectors: 'Connectors',
    placeholder: '問 eRD AI，或附加 .csv / .xlsx…',
  },

  studio: {
    emptyNoSessionHeading: '選擇或開啟一段對話',
    emptyNoSessionSubtitle: '從左側開啟或選擇一段對話開始分析。',
    emptyStartHeading: '開始分析',
    emptyStartSubtitle: '試試下方的「Daily monitor（A14）」，或請它對 Vt 做 SPC 分析。',
    artifactEmptyHeading: '尚無 Artifact',
    artifactEmptySubtitle: '請 eRD AI 執行一段分析 — Artifact 會在這裡呈現。',
    back: '返回',
    home: '首頁',
    sharedToMe: '分享給我',
    artifactNotFound: '找不到 Artifact。',
  },

  galleryHeader: {
    title: 'Artifacts',
    subtitle: 'eRD Cowork 產生的每一份 Artifact — 點擊開啟。',
    filterAll: '全部',
    filterYours: '你的',
    filterShared: '分享給我',
    filterPinned: '釘選',
    sharedBadge: '已分享',
    sharedToMe: '分享給我',
    copyLink: '複製連結',
    share: '分享',
    delete: '刪除',
    pin: '釘選',
    unpin: '取消釘選',
  },

  errors: {
    offlineHeading: '無法連線到後端服務',
    offlineDetail: '請確認服務已啟動後重試。',
    loadFailedHeading: '這個區塊載入失敗',
    /** The detail line under it. Takes the status code because that is the one piece of
     *  a failure worth showing — the rest of what axios says is its own wording, in its
     *  own language, about its own internals. */
    loadFailedDetail: (status: number) => `伺服器回應 ${status},請稍後重試。`,
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
