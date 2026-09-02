import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface SessionSelectionState {
  selectedSessionId: string | null;
  /** When the open draft was started, or null when the selection is a real session.
   *  One timestamp serves both the cache shell's `createdAt` and the rail entry's
   *  `updatedAt`, so the draft cannot disagree with itself about its own age. */
  draftStartedAt: string | null;
  selectSession: (id: string) => void;
  /** Opens a draft: a session id this client invented, which the backend will not know
   *  about until the first message upserts it (ADR-0005). */
  startDraft: (id: string, startedAt: string) => void;
  /** Nothing is open. Used when the open session stops existing — a deleted session
   *  whose id stayed selected would be re-created by the next message (ADR-0005
   *  upserts on send), so the user's delete would undo itself. */
  clearSelection: () => void;
}

export const useSessionSelectionStore = create<SessionSelectionState>()(
  devtools(
    (set) => ({
      selectedSessionId: null,
      draftStartedAt: null,
      // 選走**別的** session 就等於放棄這個草稿——它沒有任何東西需要保存。選到草稿
      // 自己則不是離開它:草稿的存在是從「這個選擇後端沒聽過」推導出來的,所以無條件
      // 清掉時間戳,等於使用者一點自己那一列,那一列就消失。
      //
      // 反過來那一半(選別的 session 就清掉)沒有測試守著,而且守不住:useSessionGroups
      // 還要求選中的 id 不在 sessions 清單裡,選了真實 session 之後那一條就先為假,所以
      // 時間戳殘不殘留都看不出差別。這裡仍然清掉是為了讓 state 自洽,不是畫面在依賴它。
      selectSession: (id) =>
        set(
          (state) => ({
            selectedSessionId: id,
            draftStartedAt: id === state.selectedSessionId ? state.draftStartedAt : null,
          }),
          false,
          'selectSession',
        ),
      startDraft: (id, startedAt) =>
        set({ selectedSessionId: id, draftStartedAt: startedAt }, false, 'startDraft'),
      clearSelection: () =>
        set({ selectedSessionId: null, draftStartedAt: null }, false, 'clearSelection'),
    }),
    { name: 'SessionSelection' },
  ),
);
