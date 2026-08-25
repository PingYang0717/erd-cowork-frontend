# architecture.md — 架構細節與設定

> 快速規則見 [`AGENTS.md`](./AGENTS.md)。本文件是完整說明與可直接複製的設定檔。

---

## 0. 技術棧總覽

| 類別              | 選擇                                           | 備註                                                                  |
| ----------------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| 框架              | React 18.3.1 + Vite 8.1.x                      | 與 `cowork-master` 對齊,共用同一個後端與同一套技術棧                  |
| 語言              | TypeScript(先關閉 strict,後續逐步開啟)         | 見第 6 節                                                             |
| UI 元件庫         | Ant Design 6.x(+ Ant Design X 2.x)             | 優先使用 antd 現成元件,避免重造輪子                                   |
| 路由              | React Router                                   | v6+ 寫法(`createBrowserRouter` / `<Routes>`)                          |
| Client 端全域狀態 | Zustand                                        | 只放 UI 狀態(sidebar 開關、theme、跨頁草稿等)                         |
| Server 端資料狀態 | TanStack Query                                 | API 資料一律走這裡,不放進 Zustand                                     |
| API 呼叫層        | Axios + 自訂 API client                        | 見第 5 節                                                             |
| 表單              | 目前以 `useState` 手刻(未安裝 React Hook Form) | 表單只有分享對話框、connector 新增、session 改名三處;複雜度上來再引入 |
| Lint / Format     | oxlint 1.71 + ESLint 9 + Prettier 3.9          | 兩個 linter 並存,分工見第 7 節;強制在 commit 前執行                   |
| Git hook          | Husky + lint-staged                            |                                                                       |

**未啟用 React Compiler。** 它以 React 19 為目標,在 18 上需要額外的
`react-compiler-runtime` polyfill;為了與 `cowork-master` 對齊而降到 18.3.1 之後,
不值得為此多背一層 runtime。`vite.config.ts` 因此是單純的 `plugins: [react()]`。

這代表 memoization 要自己顧:跨 render 的相等性(`useCallback` / `useMemo`)在需要時
得手動處理,不再有編譯器兜底。

---

## 1. 資料夾結構

**依「層」放,不依「功能」放。**

```
src/
  api/          apiClient(Axios instance)、identity、各 endpoint module
                (agentApi / sessionApi / messageApi / artifactApi /
                 connectorApi / uploadApi / liveAdapter)
  components/   依 domain 切
    artifact/   Artifact 面板、全頁檢視、版本選單、分享 dialog
    chat/       對話串、composer、反問卡、思考/產碼面板、結果表格
    connectors/ Connectors 面板
    files/      附件 chip 與上傳 modal
    gallery/    Artifacts 總覽
    session/    Session 列表與收合軌
    common/     Tooltip、ThemeToggle、ErrorBoundary、SuspenseLoader、DataBoundary
    layouts/    StudioShell、StudioLayout、ResizeHandle
  config/       執行期設定(transport、currentUser)
  constants/    共用常數(storage key)
  hooks/        資料 hook(useSessions…)與跨元件 UI hook(useDebouncedValue…)
  stores/       Zustand store
  theme/        design token
  types/        共用型別
  utils/        純函式
  app/          進入點、Router、Providers
  pages/        路由頁面——只組裝、只放 DataBoundary
  mocks/ test/  MSW handler 與測試工具
```

一個新功能會同時落在好幾個目錄:endpoint 進 `api/`、資料 hook 進 `hooks/`、UI 進
`components/<domain>/`。這是刻意的——同一層的東西彼此像,規則(`useSuspenseQuery`、
`React.FC`、共用 `apiClient`)因此能在整個目錄上一致地成立。

`app/` 與 `pages/` 不是「層」,但 router 與 providers 需要落點,而路由入口若混進
`components/` 就看不出哪些是入口。Zustand store 不放 `hooks/`,否則那個目錄會同時
裝著資料抓取、UI 邏輯與全域狀態三種東西。

## 2. Import 排序規則

由 ESLint(`eslint-plugin-simple-import-sort`)自動排序與分組,存檔/commit 前自動修正,**不需要手動排列**,但分組邏輯如下,寫在這裡是讓 agent 理解「為什麼」:

```ts
// 1. React / 外部套件
import { useState } from 'react';
import { Button } from 'antd';

// 2. 內部別名路徑(@/ 開頭)
import { useThemeStore } from '@/stores/useThemeStore';
import { apiClient } from '@/api/apiClient';

// 3. 相對路徑
import { Sidebar } from '../Sidebar';

// 4. 型別 import(可與上面分組合併,交給 plugin 處理)
import type { UserDTO } from '@/types/user';

// 5. 樣式檔一律放最後
import './App.css';
```

---

## 3. 元件內部結構順序(手動慣例,linter 無法強制,靠 review 把關)

```tsx
export function UserCard({ userId }: UserCardProps) {
  // 1. 外部/自訂 hooks(路由、query、store)
  const navigate = useNavigate();
  const { data: user } = useUser(userId);
  const isDarkMode = useThemeStore((s) => s.isDarkMode);

  // 2. useState
  const [isEditing, setIsEditing] = useState(false);

  // 3. useRef
  const inputRef = useRef<HTMLInputElement>(null);

  // 4. 衍生值(能用 React Compiler 自動優化就不手動包 useMemo)
  const displayName = user?.nickname ?? user?.email ?? '未命名';

  // 5. useEffect / useEffectEvent(放最後,且盡量少用 —— 見下方規則)
  useEffect(() => {
    // ...
  }, []);

  // 6. Event handlers
  const handleSave = () => {
    setIsEditing(false);
  };

  // 7. Early return(loading / error / empty)
  if (!user) return <Spin />;

  // 8. JSX return
  return <div>...</div>;
}
```

### useEffect 使用原則

- **預設不用。** 先問:這是不是 derived state?是不是 event handler 裡該做的事?是不是該用 TanStack Query 處理的資料抓取?
- 只有「同步元件到外部系統」(DOM API、第三方 library、訂閱)才使用 `useEffect`。
- 需要讀取最新 props/state 卻不想觸發重新執行時,用 `useEffectEvent`,不要用 `useRef` 繞。

---

## 3.5 元件、資料抓取與效能規則

### 元件

一律 `React.FC<Props>` + 具名 props interface,檔案內順序:

```tsx
interface ThinkingPanelProps { thinking: string }      // 1. props interface

const ThinkingPanel: React.FC<ThinkingPanelProps> = ({ thinking }) => {
  const [expanded, setExpanded] = useState(false);      // 2. hooks
  const toggle = useCallback(() => setExpanded(v => !v), []);  // 3. handlers
  return (/* 4. render */);
};

export default ThinkingPanel;                           // 5.
```

`React.lazy(() => import('...'))` + `<SuspenseLoader>` 只用於獨立路由或笨重的第三方
元件——不是每個元件都要切一份 chunk。

唯一不是 `React.FC` 的是 `ErrorBoundary`:React 沒有 `componentDidCatch` 的 hook 對等物。

### 資料抓取

主要資料抓取一律 `useSuspenseQuery`。呼叫端因此沒有 `isLoading` / `isError` 分支——
pending 由 `<SuspenseLoader>` 顯示、失敗由 `<ErrorBoundary>` 接,兩者包在 `DataBoundary`
裡,**放在每個窗格與每個 page 上,而不是整個 app 包一層**:一個壞掉的 Artifact 不該把
旁邊的對話串一起弄白,而直接 render 單一窗格的測試也拿得到它依賴的邊界。

Mutation 的錯誤走 `onError` callback——它不是 render 期的例外,ErrorBoundary 接不到。

**例外要寫理由。** 目前只有一個:`useArtifactContent` 留在 `useQuery`,因為它的 key 帶著
theme 與版本,換成 suspense 會讓 iframe 在每次切換時卸載重掛。

### 效能

| 規則                                    | 為什麼                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 傳給子元件的 handler 一律 `useCallback` | 每次 render 都換新身分會讓子元件的 `React.memo` 失效                                                                                       |
| 昂貴計算 `useMemo`                      | 例:Gallery 的四趟過濾 + dedupe + 排序                                                                                                      |
| 昂貴元件 `React.memo`                   | 例:`MessageBubble`——串流時整個清單每個 token 都重繪                                                                                        |
| 搜尋輸入 debounce 300–500ms             | 用 `useDebouncedValue`;輸入框綁原值、過濾綁 settled 值                                                                                     |
| `useEffect` 回傳 cleanup                | 只在它建立了存活超過該次 render 的東西時(計時器、監聽、訂閱、對外發佈的狀態)。單純設一次 `scrollTop` 沒有東西可清,補空的 `return` 只是形式 |

### 多使用者身分

所有請求帶 `X-User-Id`,唯一來源是 `api/identity.ts` 的 `getAuthHeaders()`:axios
interceptor 與 `agentApi` 的 raw fetch 共用它——串流那條路不經過 axios,漏掉 header 會被
後端當成另一個使用者。v1 是 localStorage 的匿名 UUID;internal 環境安裝一個回傳 `{}` 的
provider,讓 SSO / gateway 注入的 header 不被覆蓋。

---

## 4. 狀態管理分類原則(最容易被 agent 混用的地方,務必遵守)

| 狀態類型             | 範例                                                    | 放哪裡                                   |
| -------------------- | ------------------------------------------------------- | ---------------------------------------- |
| Server state         | API 回來的清單、詳細資料、任何需要 cache/重新驗證的資料 | **TanStack Query**,不放 Zustand          |
| Client 全域 UI state | sidebar 開合、theme(light/dark)、跨頁共用的暫存草稿     | **Zustand**                              |
| URL state            | 篩選條件、分頁、目前 tab                                | React Router 的 search params,不放 state |
| 元件區域 state       | 表單輸入中的值、Modal 開關                              | `useState`,留在元件內,不上 Zustand       |

**鐵律:API 回應資料絕對不要 `setState` 進 Zustand store。** 這是多 agent 專案最常出現的資料來源分歧問題 —— 有的 agent 會抓 API 後存進全域 store,有的直接用 `useQuery` 的 cache,長期會變成兩套不同步的資料來源。

### Sidebar / Theme store 範例(先建立,讓後續 agent 有依循範本)

```ts
// src/stores/useUIStore.ts
import { create } from 'zustand';

interface UIState {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
}));
```

```ts
// src/stores/useThemeStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDarkMode: false,
      toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
    }),
    { name: 'theme-storage' }, // localStorage key,跨 session 記住使用者選擇
  ),
);
```

> theme 用 `persist` middleware 存 localStorage;sidebar 開合是 session 內狀態,不需要 persist。

---

## 5. API 呼叫層(Axios + 自訂 API client)

```ts
// src/api/apiClient.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  // 統一附加 token 等邏輯放這裡,不要讓每個 feature 各自處理
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data, // 統一在這裡拆掉 response.data,呼叫端拿到的就是資料本身
  (error) => Promise.reject(error),
);
```

**規則:每個 endpoint module 放在 `src/api/`,不要直接在元件內寫 `apiClient.get(...)`。**

```ts
// src/api/userApi.ts
import { apiClient } from '@/api/apiClient';
import type { UserDTO } from '@/types/user';

export const userApi = {
  getUser: (id: string) => apiClient.get<UserDTO>(`/users/${id}`),
  updateUser: (id: string, payload: Partial<UserDTO>) =>
    apiClient.patch<UserDTO>(`/users/${id}`, payload),
};
```

```ts
// src/hooks/useUser.ts
import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/userApi';

export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => userApi.getUser(id),
  });
}
```

---

## 6. TypeScript 規則

- 目前**不開 strict mode**,但以下幾條先強制:
  - 禁止 `any`(`typescript/no-explicit-any: error`),真的需要時用 `unknown` 再收斂型別
  - 函式的參數與回傳值型別盡量明確標註,不依賴推斷
  - API 回應一律定義 DTO 型別(放 `src/types/api/`)
- 待專案穩定、型別覆蓋率提高後,再逐步開啟 `strict: true`(建議下一個里程碑就排入)。

---

## 7. Lint / Format 設定

**oxlint 與 ESLint 並存**,`npm run lint` 依序跑兩個(`oxlint && eslint .`)。Prettier 只
負責格式,與 lint 各司其職。

| 工具     | 負責                                            | 為什麼留著                                                                              |
| -------- | ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| oxlint   | eslint / typescript / react 的 correctness 規則 | Rust 寫的,毫秒級跑完全專案,當第一道關卡                                                 |
| ESLint   | oxlint 沒有對等能力的規則                       | 最主要是 `simple-import-sort`——沒有它,第 2 節的 import 排序就從自動化降級成 review 工作 |
| Prettier | 純格式                                          | 與 lint 分離,避免規則衝突與效能問題                                                     |

### 兩者如何不打架

`eslint.config.js` 最後一項是 `...oxlint.configs['flat/recommended']`(來自
`eslint-plugin-oxlint`),它會把 oxlint 已經覆蓋的 ESLint 規則全部關掉。所以
`react-hooks/exhaustive-deps`、`no-unused-vars`、`no-undef` 這些在 ESLint 這邊是 off,
由 oxlint 報;同一個問題只會被報一次。

**這一項必須放在最後**,否則會被前面的設定覆蓋回去。

`eslint-plugin-oxlint` 的版本要跟著 oxlint 走(peer 是 `~<oxlint 版本>`),升 oxlint 時
要一起升。

### 安裝套件

```bash
npm install -D oxlint eslint-plugin-oxlint \
  eslint @eslint/js typescript-eslint globals \
  eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh \
  eslint-plugin-simple-import-sort eslint-plugin-jsx-a11y \
  eslint-config-prettier prettier \
  husky lint-staged
```

### `.oxlintrc.json`

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc", "import"],
  "rules": {
    "react/rules-of-hooks": "error",
    "react/exhaustive-deps": "warn",
    "react/only-export-components": ["warn", { "allowConstantExport": true }],
    "typescript/no-explicit-any": "error",
    "typescript/no-unused-vars": "warn",
    "import/no-unassigned-import": "off"
  },
  "ignorePatterns": ["dist", "coverage", "node_modules"]
}
```

規則集刻意對齊原本的 ESLint 設定,沒有加嚴:`eslint-plugin-jsx-a11y` 一直只被註冊、
一條規則都沒開,所以 a11y 實際上不在 lint 範圍內,這裡維持如此(要開的話兩邊擇一,
別同時開)。

### `eslint.config.js`

見專案根目錄該檔案,檔頭有分工說明。

## 8. 主題色票(light / dark)

色票唯一來源是 `src/theme/tokens.ts`,整份逐值抄自設計稿
`eRDWorkspace20260819.html` 的 `:root` / `:root[data-theme="dark"]`(ADR-0004)。
不要在元件裡寫死顏色,也不要依賴 antd 演算法的預設值 —— 它的 dark 表面色
(`#000000` / `#141414` / `#1f1f1f`)與設計稿(`#17181c` / `#1f1f22` /
`#262629`)並不相同。

這張表同時餵兩個消費端:

1. **antd `ConfigProvider` 的 token**(antd 自己畫的元件)
2. **`--erd-color-*` CSS 自訂屬性**(CSS Modules 讀的那些)

CSS 或 inline style 用到的變數,必須在這張表裡存在;漏掉的話在 dark mode 會
安靜地停在 fallback 的亮色值。

**餵 antd 時要區分兩種 token**:

- **seed**(`colorPrimary` / `colorSuccess` / `colorWarning` / `colorError`)
  兩個主題都餵**亮色**值。設計稿的 dark 色盤本來就是 antd 由亮色 seed 推導出來的
  結果(`#1677ff` → `#1668dc`、`#52c41a` → `#49aa19`),餵已經變暗的值會被再暗一次。
- **map / alias**(表面、邊框、填色、文字、`colorPrimaryBg` 這類)
  在推導之後才套用,直接餵當前主題的值即可。

**變數宣告在 `:root`,不要掛在某個 wrapper `<div>` 上。** 對話框(antd Modal)、
下拉選單(antd Dropdown)、收合後的 chat history flyout 全都 portal 到
`document.body`,在 React 樹的 wrapper 之外;變數若只設在 wrapper 的 inline style,
這些表面讀不到,會安靜地退回每個 `var()` 裡寫的亮色 fallback —— 看起來就是「dark
mode 下對話框還是亮的」。目前 `AppProviders` 直接渲染一段 `<style>` 輸出
`:root { --erd-color-*: … }`。

antd 自己畫的對話框外框(邊框、陰影、遮罩)CSS Module 碰不到,那幾條放在
`src/index.css`。注意 antd v6 的對話框面板是 `.ant-modal-container`
(舊版是 `.ant-modal-content`),選錯就是整條規則靜靜失效。

Artifact 在 iframe 內(ADR-0001)讀不到外層的 CSS 變數,所以
`src/mocks/artifactFixtures.ts` 自帶一份同值的色票 —— 改色時兩邊要一起改。
