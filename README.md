# eRD Cowork — Frontend

半導體廠務 R&D 平台（eRD Workspace）內的 AI 對話式分析工具。工程師以自然語言提出分析請求，系統回覆一段可視化的分析成果（**Artifact**），呈現在 Studio 右側的 sandboxed iframe 中。

前端打的是**真實後端**。後端尚未實作的端點在 `src/api/` 直接回 stub，而它們背後的操作（釘選、改名、刪除、生成、分享、Connector 連線）在 UI 上明確停用，不假裝有作用——見 [ADR-0009](./docs/adr/0009-no-mock-backend-at-runtime.md)。MSW 只服務測試。名詞定義見 [`CONTEXT.md`](./CONTEXT.md)。

---

## 技術棧

React 19 + Vite + TypeScript（先不開 strict）+ Ant Design + React Router + Zustand + TanStack Query + Axios，Vitest + Testing Library 做測試，MSW 在測試裡當後端。

React Compiler 已開啟（`@vitejs/plugin-react` 的 `compiler: true`，需 `oxc-transform-react`），因此不手動包 `useMemo` / `useCallback`。

---

## 快速開始

```bash
npm install
npm run dev        # 開發伺服器
```

| 指令                 | 用途                             |
| -------------------- | -------------------------------- |
| `npm run dev`        | Vite 開發伺服器                  |
| `npm run build`      | `tsc -b` 後產出 production build |
| `npm run preview`    | 預覽 build 結果                  |
| `npm run lint`       | ESLint                           |
| `npm test`           | Vitest 單次執行                  |
| `npm run test:watch` | Vitest watch 模式                |

Commit 前 Husky + lint-staged 會自動跑 `oxlint --fix` → `eslint --fix` → `prettier --write`，不需要手動格式化。

> **測試提醒**：機器負載高時，平行執行會讓 `findBy*` 的 5 秒預設逾時被撐爆而出現偽陽性失敗。遇到時改用 `npx vitest run --no-file-parallelism`（較慢但穩定），單檔執行也不受影響。

---

## 資料夾結構

依「層」放，不依「功能」放。

```
src/
  api/          # apiClient（Axios instance）、identity、各 endpoint module
  components/   # 依 domain 切：artifact / chat / connectors / files /
                #   gallery / session / common / layouts
  config/       # 執行期設定（transport、currentUser）
  constants/    # 共用常數（storage key）
  hooks/        # 資料 hook 與跨元件 UI hook
  stores/       # Zustand store
  theme/        # design token
  types/api/    # 共用 DTO 型別
  utils/        # 純函式工具
  app/          # 進入點、Router、Providers（含主題設定）
  pages/        # 路由頁面（只組裝、只放 DataBoundary）
  mocks/        # MSW handlers 與 fixtures（test-only）
```

規則細節見 [`AGENTS.md`](./AGENTS.md)（動工前必讀的五條鐵律與六條撰寫規則）與
[`architecture.md`](./architecture.md)（完整架構與設定）。

---

## 路由

| 路徑                           | 畫面                                              |
| ------------------------------ | ------------------------------------------------- |
| `/cowork`                      | Studio：Session 列表、對話串、Artifact 面板三欄   |
| `/cowork/artifacts`            | Artifacts 總覽                                    |
| `/cowork/schedule`             | Schedule 排程列表（**尚未實作**，見下方範圍說明） |
| `/cowork/artifact/:artifactId` | 單一 Artifact 全頁檢視                            |

設計稿本身是純 state 切換的單頁 app，改用 React Router 是刻意的偏離，理由見 [ADR-0002](./docs/adr/0002-react-router-despite-state-driven-mockup.md)。

---

## 後端與 stub

app 打真實後端，沒有 runtime mock（[ADR-0009](./docs/adr/0009-no-mock-backend-at-runtime.md)）。後端還沒建好的端點分成兩類處理：

- **讀取**（Connectors、Directory）在 `src/api/` 直接回一份固定 stub，就寫在它假裝的那個函式旁邊。
- **寫入**（Session 釘選／改名／刪除、Artifact 分享／刪除、Connector 連線與新增）在 UI 上 disabled，標示「後端尚未支援」。api 函式保留但沒有呼叫端，是後端補上那天的接點。

Artifact 的清單、釘選與發布已接真後端。

`src/mocks/handlers.ts` 只在**測試**裡跑（`src/test/setup.ts` 起 node server），服務的正是後端真的有的那九條，加上 SSE 劇本。集合資料透過 `createPersistedResource` 存在 `localStorage`，讓測試能驗跨重整的行為。

**API 契約的唯一來源是 [`docs/api/interface.md`](./docs/api/interface.md)**，每條端點都標了後端狀態。Artifact 的擁有者只存在後端（`ownerId`），對外只以 `Artifact.mine` 呈現。

---

## 主題與視覺對齊

設計稿 `eRDWorkspace20260819.html` 不是「參考」而是**必須符合**的基準（[ADR-0004](./docs/adr/0004-mockup-visual-fidelity-via-ant-design-icons.md)）：版面、間距、圖示（一律用 `@ant-design/icons`，不用文字或 emoji 頂替）都要對齊。

色票唯一來源是 `src/theme/tokens.ts`，逐值抄自設計稿的 light / dark 兩組 CSS 變數，同時餵給 antd `ConfigProvider` 與 `--erd-color-*` 自訂屬性。改色前請先讀 `architecture.md` 第 8 節，其中兩個坑值得先知道：

- antd 的 **seed token 兩個主題都要餵亮色值**，否則 dark 會被二次變暗。
- 變數必須宣告在 `:root`。對話框、下拉選單、收合後的 flyout 都是 portal 到 `document.body`，掛在 wrapper `<div>` 上它們讀不到。

---

## 文件地圖

| 文件                                                               | 內容                                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------- |
| [`AGENTS.md`](./AGENTS.md)                                         | 動工前必讀的精簡規則                                    |
| [`architecture.md`](./architecture.md)                             | 架構、設定檔、狀態分類、主題色票                        |
| [`CONTEXT.md`](./CONTEXT.md)                                       | 領域名詞與該避免的說法                                  |
| [`docs/adr/`](./docs/adr/)                                         | 架構決策紀錄（iframe 渲染、Router、範圍界定、視覺對齊） |
| [`docs/api/interface.md`](./docs/api/interface.md)                 | API 契約                                                |
| [`docs/agents/`](./docs/agents/)                                   | issue tracker、triage 標籤、domain 文件慣例             |
| [`.scratch/erd-cowork-frontend/`](./.scratch/erd-cowork-frontend/) | spec 與逐張 ticket（含 review 後的 Comments）           |

---

## 目前範圍與未完成項目

實作範圍限定在 eRD Cowork 這個 App 內部，Workspace 外殼與其他 App 入口不在此次範圍（[ADR-0003](./docs/adr/0003-scope-limited-to-erd-cowork-app.md)）。

已知未完成，皆有紀錄、非疏漏：

- **Ticket 15 Schedule 排程列表** — 刻意延後，`/cowork/schedule` 目前只有標題。
- **ADR-0004 視覺缺口三項** — Artifact 全頁 header 未顯示名稱與「Shared to me」、附件未做 `.csv` / `.xlsx` 型別過濾、拖放只在 modal 內而非 composer。詳見 ticket 10 與 17 的 Comments。
- **未啟用 React Compiler** — 技術棧對齊 `cowork-master` 後降到 React 18.3.1，而 compiler 以 19 為目標，在 18 上需要額外的 `react-compiler-runtime` polyfill。memoization 現在要自己顧。
- **`@ant-design/x` 已安裝但尚無使用處** — 隨技術棧對齊加入；`cowork-master` 用它做 `StepChain`，本專案有自己的步驟卡，尚未決定採用點。

## 執行

先建立 `.env`（`.gitignore` 排除，可從 `.env.example` 複製）：

```
VITE_API_BASE_URL=/api
```

```
npm run dev
```

`/api` 保持相對路徑，在 `vite.config.ts` 加 proxy 指到後端；直連絕對 URL 需要後端開 CORS
並允許 `X-User-Id`，見 [`docs/api/backend-integration.md`](docs/api/backend-integration.md)。

**後端沒起來時**，session 清單會失敗，`useSuspenseQuery` 把錯誤丟給 ErrorBoundary，畫面
顯示「無法連線到後端服務」與重試鈕。這是設計上的行為：沒有 stub 會頂上去假裝成功。

## 已知環境需求

- Node 22 以上內建的 `localStorage` 會蓋掉 jsdom 的，導致測試全紅。`.npmrc` 已設
  `node-options=--no-experimental-webstorage` 處理掉這件事。
