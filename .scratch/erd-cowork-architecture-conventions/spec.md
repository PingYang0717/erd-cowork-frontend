# eRD Cowork — 架構與撰寫慣例對齊

## Problem Statement

專案目前是 feature-first 佈局（`features/<name>/{api,components,hooks,store}`），與團隊訂
下的 layer-first 慣例不同。同時有幾條撰寫規則尚未落地：元件沒有統一的 `React.FC<Props>`
形式與檔案內順序、資料抓取仍是 `useQuery` + 手動 loading 分支、沒有 ErrorBoundary、
API 請求不帶身分 header。

## Solution

改成 layer-first 佈局，並把六類撰寫規則落實到程式碼與文件。**所有既有功能與 139 個測試
必須維持通過**——這是重構，不是改行為。

## Target structure

```
src/
  api/          apiClient + 各 endpoint module（agentApi / sessionApi / messageApi /
                artifactApi / connectorApi / uploadApi / liveAdapter）
  components/   依 domain 切：artifact / chat / connectors / files / gallery /
                session / common / layouts
  config/       執行期設定（transport、suggestedPrompts）
  constants/    共用常數（storage keys、共用文案）
  hooks/        跨元件的 hook
  stores/       Zustand store
  theme/        design token
  types/        共用型別
  utils/        純函式
  app/          進入點、Router、Providers
  pages/        路由頁面（只組裝）
  mocks/ test/  MSW 與測試工具
```

## 規則

### 元件

- 一律 `React.FC<Props>` + TypeScript props interface
- 檔案內順序：props interface → hooks → handlers（`useCallback`）→ render → `export default`
- `React.lazy(() => import('...'))` + `<SuspenseLoader>` 只用於獨立路由或笨重的第三方元件

### 資料抓取

- 主要資料抓取一律 `useSuspenseQuery`，不用 `useQuery` + `isLoading`
- API client 集中在 `src/api`，共用同一個 `apiClient`
- Mutation 錯誤走 `onError` callback；`useSuspenseQuery` 的錯誤由 `<ErrorBoundary>` 接

### 效能

- 傳給子元件的 event handler 一律 `useCallback` 包起來
- 昂貴計算 `useMemo`、昂貴元件 `React.memo`
- 搜尋輸入 debounce 300–500ms
- `useEffect` 一律回傳 cleanup

### Import alias

- 只有 `@/`（指向 `src/`，定義在 `vite.config.ts` 與 `tsconfig.app.json`）
- 不新增其他自訂 alias

### 多使用者身分

- 所有 API 請求帶 `X-User-Id` header
- v1：localStorage 的匿名 UUID，由 axios interceptor 附加
- internal 環境：改由 SSO / gateway 注入，前端不自行產生

## Implementation Decisions

- **保留 `src/app/` 與 `src/pages/`**。清單沒有列到它們，但 router 與 providers 需要落點，
  而路由頁面若塞進 `components/` 會讓「哪些是路由入口」變得看不出來。`pages/` 維持只組裝、
  不寫邏輯的既有規則。
- **Zustand store 放 `src/stores/`**，不放 `hooks/`。它們雖然以 hook 形式被消費，但混進
  `hooks/` 會讓那個目錄同時裝著資料抓取、UI 邏輯與全域狀態三種東西。
- **CSS Module 與元件同層**，維持相對 import（`./X.module.css`）——它們是同一個東西的兩半。
- **`useSuspenseQuery` 的遷移範圍**：只換「主要資料抓取」。`useArtifactContent` 這種會隨
  theme / version 反覆重抓的，換成 suspense 會讓整個面板在每次切換時消失重掛，不是規則
  想要的效果——這類維持 `useQuery` 並在 ticket 中逐一記錄理由。

## Out of Scope

- 行為改變。這次不新增功能、不改 UI，139 個測試維持綠燈是驗收條件。
- `internal` 環境的 SSO 實作本身（前端只留接縫）。
