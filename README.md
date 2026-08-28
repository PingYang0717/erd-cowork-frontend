# eRD Cowork — Frontend

半導體廠務 R&D 平台（eRD Workspace）內的 AI 對話式分析工具。工程師以自然語言提出分析
請求，系統回覆一段可視化的分析成果（**Artifact**），呈現在 Studio 右側的 sandboxed
iframe 中。

前端打的是**真實後端**，沒有 runtime mock（[ADR-0006](./docs/adr/0006-no-mock-backend-at-runtime.md)）。
MSW 只服務測試。名詞定義見 [`CONTEXT.md`](./CONTEXT.md)。

---

## 技術棧

React 18.3.1 + Vite 8 + TypeScript 6（strict）+ Ant Design 6（含 Ant Design X）+
React Router 7 + Zustand + TanStack Query + Axios。測試是 Vitest + Testing Library，
MSW 在測試裡當後端。

技術棧與 cowork 上游對齊——兩邊接同一個後端。

**未啟用 React Compiler**：它以 React 19 為目標，在 18 上需要額外的
`react-compiler-runtime` polyfill，不值得為此多背一層 runtime。memoization 要自己顧
（`useCallback` / `useMemo` / `React.memo`）。

---

## 執行

```bash
npm install
npm run dev
```

不需要任何環境變數：API base 寫死 `/api`，dev/preview 由 `vite.config.ts` 的 proxy 轉到
`http://localhost:8080`（[ADR-0007](./docs/adr/0007-cowork-file-parity-for-api-seams.md)）。

| 指令                 | 用途                             |
| -------------------- | -------------------------------- |
| `npm run dev`        | Vite 開發伺服器                  |
| `npm run build`      | `tsc -b` 後產出 production build |
| `npm run preview`    | 預覽 build 結果                  |
| `npm run lint`       | oxlint + ESLint（依序）          |
| `npm run lint:fix`   | 兩者的 `--fix`                   |
| `npm test`           | Vitest 單次執行                  |
| `npm run test:watch` | Vitest watch 模式                |

Commit 前 Husky + lint-staged 會自動跑 `oxlint --fix` → `eslint --fix` →
`prettier --write`，不需要手動格式化。

**後端沒起來時**，session 清單會失敗，`useSuspenseQuery` 把錯誤丟給 ErrorBoundary，畫面
顯示「無法連線到後端服務」與重試鈕。這是設計上的行為：沒有 stub 會頂上去假裝成功。

---

## 資料夾結構

依「層」放，不依「功能」放。

```
src/
  api/          # apiClient（Axios instance + 匿名身分與 auth header provider）
                #   與各 endpoint module
  bootstrap/    # internal 環境的啟動接縫（SSO 在 mount 前決定身分）
  components/   # 依 domain 切：artifact / chat / connectors / files /
                #   gallery / session / common / layouts
  constants/    # 共用常數（storage key、預設標題）
  hooks/        # 資料 hook 與跨元件 UI hook
  stores/       # Zustand store
  theme/        # design token
  types/api/    # 與後端 DTO 逐字一致的型別
  utils/        # 純函式工具
  app/          # Router、Providers（含主題設定）；進入點是 src/main.tsx
  pages/        # 路由頁面（只組裝、只放 DataBoundary）
  mocks/ test/  # MSW handlers、fixtures 與測試工具（test-only）
```

規則細節見 [`AGENTS.md`](./AGENTS.md)（動工前必讀的五條鐵律與六條撰寫規則）與
[`architecture.md`](./architecture.md)（完整架構與設定）。

---

## 路由

**hash 路由**（`createHashRouter`）：實際網址是 `/#/cowork/...`。

| 路由                           | 畫面                                              |
| ------------------------------ | ------------------------------------------------- |
| `/cowork`                      | Studio：Session 列表、對話串、Artifact 面板三欄   |
| `/cowork/artifacts`            | Artifacts 總覽                                    |
| `/cowork/schedule`             | Schedule 排程列表（**尚未實作**，見下方範圍說明） |
| `/cowork/artifact/:artifactId` | 單一 Artifact 全頁檢視                            |

設計稿本身是純 state 切換的單頁 app（重新整理會遺失所在畫面），改用 React Router 是刻意
的偏離：真實路由讓重新整理不遺失畫面，也讓單一 Artifact 能以連結直接開啟。

用 hash 而非 history 是為了**不依賴伺服器設定**（[ADR-0011](./docs/adr/0011-hash-router.md)）：
history 路由要求把所有路徑 fallback 到 `index.html`，否則使用者在
`/cowork/artifact/xxx` 按重新整理就是 404。這個 app 會掛在
eRD Workspace 底下、由不一定歸我們管的那層代理服務，hash 讓部署少一個前提。

**離開 app 的連結一律用 `utils/artifactUrl.ts`**（Copy Link、開新分頁）：`navigate()` 會
自己補上 `#`，但 `window.open` 與剪貼簿不會，漏了就是一個打不開又不報錯的連結。

---

## 後端與 stub

**API 契約的唯一來源是 [`docs/api/interface.md`](./docs/api/interface.md)**，每條端點都標了
後端狀態；對接用的逐條核對表在 [`docs/api/api-checklist.md`](./docs/api/api-checklist.md)。

Session（含改名、釘選、刪除）、對話串流、檔案上傳、Artifact（清單、內容、修復、釘選、
發布、刪除、分享）都已接真後端。還沒落地的只有三處：

- **`GET /directory`** — 分享對話框的收件者名單，`src/api/` 直接回固定資料。
- **Connector** — 目錄是前端常數，使用者的選擇存 localStorage。面板**可以操作**，只是
  還沒有帳號層級的歸屬。
- **`DELETE /artifacts/:id/publish`（取消發布）** — 契約與函式都在，UI 上還沒有入口。

`src/mocks/handlers.ts` 只在**測試**裡跑（`src/test/setup.ts` 起 node server）。集合資料
透過 `createPersistedResource` 存在 `localStorage`，讓測試能驗跨重整的行為。

仍需後端配合的能力（分析條件表單、結構化答案、Connector 端點等）集中在
[`docs/api/backend-feedback.md`](./docs/api/backend-feedback.md)。

---

## 主題與視覺對齊

設計稿 `eRDWorkspace20260819.html` 不是「參考」而是**必須符合**的基準
（[ADR-0002](./docs/adr/0002-visual-authority-mockup-except-chat-panel.md)）：版面、間距、
圖示（一律用 `@ant-design/icons`，不用文字或 emoji 頂替）都要對齊。**唯一的例外是
chat panel**，它的呈現語彙以 cowork 上游為準。

色票唯一來源是 `src/theme/tokens.ts`，逐值抄自設計稿的 light / dark 兩組 CSS 變數，同時
餵給 antd `ConfigProvider` 與 `--erd-color-*` 自訂屬性。改色前請先讀 `architecture.md`
第 8 節，其中兩個坑值得先知道：

- antd 的 **seed token 兩個主題都要餵亮色值**，否則 dark 會被二次變暗。
- 變數必須宣告在 `:root`。對話框、下拉選單、收合後的 flyout 都是 portal 到
  `document.body`，掛在 wrapper `<div>` 上它們讀不到。

深色模式只作用在 app 本身。**Artifact 的 iframe 內容永遠是單一配色**——它沒有 theme
變體（[ADR-0001](./docs/adr/0001-artifact-rendered-via-sandboxed-iframe.md)）。

---

## 文件地圖

| 文件                                         | 內容                                        |
| -------------------------------------------- | ------------------------------------------- |
| [`AGENTS.md`](./AGENTS.md)                   | 動工前必讀的精簡規則                        |
| [`architecture.md`](./architecture.md)       | 架構、設定檔、狀態分類、主題色票            |
| [`CONTEXT.md`](./CONTEXT.md)                 | 領域名詞與該避免的說法                      |
| [`docs/adr/`](./docs/adr/)                   | 架構決策紀錄（十一份，皆為現行決策）        |
| [`docs/api/`](./docs/api/)                   | API 契約、對接核對表、後端回饋、接線指南    |
| [`docs/agents/`](./docs/agents/)             | domain 文件慣例（CONTEXT.md 與 ADR 怎麼寫） |
| [`src/test/README.md`](./src/test/README.md) | 測試的兩個 seam 與兩道環境 shim             |

---

## 目前範圍與未完成項目

實作範圍限定在 eRD Cowork 這個 App 內部。Workspace 外殼（Home 首頁、左側 App 切換 rail
上的其他入口）在設計稿裡本來就只有外殼、沒有互動邏輯，不在此次範圍。

已知未完成，皆有紀錄、非疏漏：

- **Schedule 排程列表** — `/cowork/schedule` 目前只有標題，無任何端點。
- **`Artifact.type`（dashboard / slides）** — 後端契約定版時暫時拿掉，尚未加回。在它回來
  之前 Gallery 不顯示縮圖與 Dash/Deck 標籤，而不是讓每張卡都預設成同一個錯答案。
- **視覺缺口三項** — Artifact 全頁 header 未顯示名稱與「Shared to me」、附件未做
  `.csv` / `.xlsx` 型別過濾、拖放只在 modal 內而非 composer。
- **`@ant-design/x` 已安裝但尚無使用處** — 隨技術棧對齊加入；cowork 用它做 `StepChain`，
  本專案有自己的步驟卡，尚未決定採用點。

## 已知環境需求

- Node 22 以上內建的 `localStorage` 會蓋掉 jsdom 的，導致測試全紅。`.npmrc` 已設
  `node-options=--no-experimental-webstorage` 處理掉這件事。
