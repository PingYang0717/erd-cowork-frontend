# eRD Cowork — Frontend

半導體廠務 R&D 平台（eRD Workspace）內的 AI 對話式分析工具。工程師以自然語言提出分析請求，系統回覆一段可視化的分析成果（**Artifact**），呈現在 Studio 右側的 sandboxed iframe 中。

目前是**純前端 + mock 後端**的實作：所有 API 由 MSW 攔截，資料存在 `localStorage`，沒有真實後端與登入流程。名詞定義見 [`CONTEXT.md`](./CONTEXT.md)。

---

## 技術棧

React 19 + Vite + TypeScript（先不開 strict）+ Ant Design + React Router + Zustand + TanStack Query + Axios，MSW 做 mock 後端，Vitest + Testing Library 做測試。

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

Commit 前 Husky + lint-staged 會自動跑 `eslint --fix` 與 `prettier --write`，不需要手動格式化。

> **測試提醒**：機器負載高時，平行執行會讓 `findBy*` 的 5 秒預設逾時被撐爆而出現偽陽性失敗。遇到時改用 `npx vitest run --no-file-parallelism`（較慢但穩定），單檔執行也不受影響。

---

## 資料夾結構

```
src/
  app/          # 進入點、Router、Providers（含主題設定）
  layouts/      # 版面
  pages/        # 路由頁面（只組裝，不寫邏輯）
  features/     # 依功能切，內含 api/ hooks/ store/ components/
  components/   # 跨 feature 共用元件
  hooks/        # 跨 feature 共用 hooks
  stores/       # 跨 feature 共用 Zustand store
  services/     # apiClient.ts（Axios instance）、currentUser.ts（mock 身分）
  types/api/    # 共用 DTO 型別
  utils/        # 純函式工具
  mocks/        # MSW handlers 與 fixtures
```

規則細節見 [`AGENTS.md`](./AGENTS.md)（動工前必讀的五條鐵律）與 [`architecture.md`](./architecture.md)（完整架構與設定）。

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

## Mock 後端

`src/mocks/handlers.ts` 以 MSW 攔截所有 `/api/*` 請求，dev 模式走 browser worker、測試走 node server，共用同一份 handlers。集合資料透過 `createPersistedResource` 存在 `localStorage`，重新整理不會遺失。

**API 契約的唯一來源是 [`docs/api/interface.md`](./docs/api/interface.md)** —— 換成真實後端時照著實作，前端呼叫端不需要改。Artifact 的擁有者只存在 mock 端（`ownerId`），對外只以 `Artifact.mine` 呈現，依 `services/currentUser.ts` 的 mock 身分解析。

---

## 主題與視覺對齊

設計稿 `eRDWorkspace20260819.html` 不是「參考」而是**必須符合**的基準（[ADR-0004](./docs/adr/0004-mockup-visual-fidelity-via-ant-design-icons.md)）：版面、間距、圖示（一律用 `@ant-design/icons`，不用文字或 emoji 頂替）都要對齊。

色票唯一來源是 `src/features/theme/tokens.ts`，逐值抄自設計稿的 light / dark 兩組 CSS 變數，同時餵給 antd `ConfigProvider` 與 `--erd-color-*` 自訂屬性。改色前請先讀 `architecture.md` 第 8 節，其中兩個坑值得先知道：

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
- **Ticket 18 DC Item 選擇器** — 尚未動工，只有 `types/api/dcItem.ts`。
- **ADR-0004 視覺缺口三項** — Artifact 全頁 header 未顯示名稱與「Shared to me」、附件未做 `.csv` / `.xlsx` 型別過濾、拖放只在 modal 內而非 composer。詳見 ticket 10 與 17 的 Comments。
- **`ThreadPanel` 未被 React Compiler 優化** — 步驟播放的 effect 帶有 `eslint-disable`，compiler 遇到 rule suppression 會整個元件略過（build 時有警告）。
