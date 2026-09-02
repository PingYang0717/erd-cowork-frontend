/** Strings the backend owns, kept here to be compared against — not copy.
 *
 *  Every value below is matched byte for byte against something the backend persisted,
 *  so translating one does not change what the user reads: it stops the match, and the
 *  thing that depended on it silently stops happening. An interrupted reply would no
 *  longer be recognised as interrupted.
 *
 *  The file is named for the wire rather than for messages on purpose. It used to be
 *  `messages.ts`, which reads like a home for UI copy — and once `src/i18n/` exists next
 *  to it, that name is an invitation to move these into the dictionary. The UI copy this
 *  app owns lives there; nothing here is translatable.
 */
/** Default title for a draft session, shown until the first question renames it.
 *  MUST match the backend's SessionGuard.DEFAULT_SESSION_TITLE. */
export const DRAFT_SESSION_TITLE = 'New analysis' as const;

/** Texts the backend persists as an AI message when the SSE client disconnects
 *  mid-run — both the current and the legacy parenthesised form, so older history
 *  rows are still recognised. These are the backend's own strings, not our copy:
 *  they stay in Chinese and must match byte for byte.
 *  NEVER compare against raw string literals — always reference this array. */
export const INTERRUPTED_TEXTS: readonly string[] = [
  '回應已中斷，請重新送出以繼續',
  '（回應已中斷，請重新送出以繼續）',
] as const;

/** Prefixes of the repair-outcome records the backend persists as AI messages. The
 *  bubble renders a match as a small hint rather than routing it through Markdown.
 *  NEVER compare against raw string literals — always reference this array. */
export const REPAIR_RECORD_PREFIXES: readonly string[] = [
  '已修復儀表板執行錯誤',
  '儀表板執行錯誤自動修復未成功',
] as const;
