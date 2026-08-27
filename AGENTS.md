## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five canonical role strings (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (root `CONTEXT.md` + `docs/adr/`). See `docs/agents/domain.md`.

# AGENTS.md — Agent 開工前必讀

> 詳細架構說明、完整程式碼範例、Lint/Format 設定,見 [`architecture.md`](./architecture.md)。
> 本文件只列「動工時必須遵守」的規則,保持精簡。

---

## 技術棧

React 18.3.1 + Vite 8 + TypeScript 6(先不開 strict)+ Ant Design 6(含 Ant Design X)+ React Router 7 + Zustand + TanStack Query + Axios。

Lint 是 **oxlint + ESLint 並存**(`npm run lint` 依序跑兩個),格式走 Prettier。
技術棧與 `cowork-master` 對齊——兩邊接同一個後端。

---

## 五條鐵律

1. **API 資料一律用 TanStack Query,絕對不要 `setState` 進 Zustand。**
   Zustand 只放 client 端全域 UI 狀態(sidebar 開合、theme、跨頁草稿)。

2. **useEffect 預設不用。**
   先確認是不是 derived state、event handler、或該用 TanStack Query 抓資料,只有「同步外部系統」才用 `useEffect`。

3. **依「層」放,不依「功能」放。** endpoint module 進 `api/`、資料 hook 進 `hooks/`、
   UI 進 `components/<domain>/`、Zustand store 進 `stores/`。`pages/` 只組裝、不寫邏輯。

4. **Import 排序交給 ESLint 自動處理,不用手動排。**
   `simple-import-sort` 是 ESLint 留在陣容裡的主要理由——oxlint 沒有對等能力。

5. **元件內部依序寫:hooks → useState → useRef → 衍生值 → useEffect → event handler → early return → JSX。**

---

## 資料夾結構(速查)

```
src/
  api/          # apiClient(Axios instance)+ 各 endpoint module + identity
  components/   # 依 domain 切:artifact / chat / connectors / files /
                #   gallery / session / common / layouts
  config/       # 執行期設定(transport、currentUser)
  constants/    # 共用常數(storage key 等)
  hooks/        # 資料 hook 與跨元件的 UI hook
  stores/       # Zustand store
  theme/        # design token
  types/        # 共用型別
  utils/        # 純函式工具
  app/          # 進入點、Router、Providers
  pages/        # 路由頁面(只組裝、只放邊界)
  mocks/ test/  # MSW 與測試工具（test-only，app 不跑 MSW）
```

---

## Commit 前

Husky + lint-staged 會自動跑 `oxlint --fix` → `eslint --fix` → `prettier --write`,不需要手動格式化。設定方式見 `architecture.md` 第 7 節。

---

## 六條撰寫規則

### 元件

- 一律 `React.FC<Props>` + 具名 props interface
- 檔案內順序:**props interface → hooks → handlers(`useCallback`)→ render → `export default`**
- `React.lazy(() => import('...'))` + `<SuspenseLoader>` 只用於獨立路由或笨重的第三方元件
- 唯一例外是 `ErrorBoundary`——React 沒有 `componentDidCatch` 的 hook 對等物,它必須是 class

### 資料抓取

- 主要資料抓取一律 **`useSuspenseQuery`**,不要 `useQuery` + `isLoading`
- API 一律走 `src/api` 的共用 `apiClient`,不要在元件裡開 axios
- Mutation 錯誤走 `onError`;`useSuspenseQuery` 的錯誤由 `<ErrorBoundary>` 接
- 例外要在該 hook 的註解裡寫明理由(現有唯一一個:`useArtifactContent`)

### 效能

- 傳給子元件的 event handler 一律 `useCallback`
- 昂貴計算 `useMemo`、昂貴元件 `React.memo`
- 搜尋輸入 debounce 300–500ms(用 `useDebouncedValue`)
- `useEffect` 若建立了存活超過該次 render 的東西(計時器、監聽、訂閱、對外發佈的狀態),
  一律回傳 cleanup

### Import alias

- 只有 `@/`(指向 `src/`,定義在 `vite.config.ts` 與 `tsconfig.app.json`)
- 不新增其他自訂 alias;同資料夾的檔案(元件與它的 `.module.css`)用相對路徑

### 多使用者身分

- 所有 API 請求帶 `X-User-Id`,由 `api/identity.ts` 的 `getAuthHeaders()` 供應
- v1:localStorage 的匿名 UUID,axios interceptor 附加;`agentApi` 的 raw fetch 共用同一個 helper
- internal 環境:SSO / gateway 注入,前端安裝回傳 `{}` 的 provider,不覆蓋它

### 測試

- 預設不平行(`fileParallelism: false`)。每個窗格都會先 suspend,24 個檔案同時跑會餓死
  那些等待,讓單獨跑會過的測試在整批跑時失敗
