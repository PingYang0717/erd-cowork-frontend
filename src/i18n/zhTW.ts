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
