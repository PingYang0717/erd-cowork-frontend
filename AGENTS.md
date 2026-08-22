## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five canonical role strings (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (root `CONTEXT.md` + `docs/adr/`). See `docs/agents/domain.md`.

# AGENTS.md — Agent 開工前必讀

> 詳細架構說明、完整程式碼範例、ESLint/Prettier 設定,見 [`architecture.md`](./architecture.md)。
> 本文件只列「動工時必須遵守」的規則,保持精簡。

---

## 技術棧

React 19 + Vite + TypeScript(先不開 strict)+ Ant Design + React Router + Zustand + TanStack Query + Axios。

---

## 五條鐵律

1. **API 資料一律用 TanStack Query,絕對不要 `setState` 進 Zustand。**
   Zustand 只放 client 端全域 UI 狀態(sidebar 開合、theme、跨頁草稿)。

2. **useEffect 預設不用。**
   先確認是不是 derived state、event handler、或該用 TanStack Query 抓資料,只有「同步外部系統」才用 `useEffect`。

3. **新功能放進 `features/<功能名稱>/`,不要塞進 `pages/` 或 `components/`。**
   `pages/` 只組裝、不寫邏輯。

4. **Import 排序交給 ESLint 自動處理,不用手動排。**

5. **元件內部依序寫:hooks → useState → useRef → 衍生值 → useEffect → event handler → early return → JSX。**

---

## 資料夾結構(速查)

```
src/
  app/          # 進入點、Router、Providers
  layouts/      # Sidebar、Header 等版面
  pages/        # 路由頁面(組裝用,不寫邏輯)
  features/     # 依功能切,內含 api/ hooks/ store/ components/
  components/   # 跨 feature 共用元件
  hooks/        # 跨 feature 共用 hooks
  stores/       # 跨 feature 共用 Zustand store
  services/     # apiClient.ts(Axios instance)
  types/        # 共用型別
  utils/        # 純函式工具
```

---

## Commit 前

Husky + lint-staged 會自動跑 `eslint --fix` 與 `prettier --write`,不需要手動格式化。設定方式見 `architecture.md` 第 7 節。
