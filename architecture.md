# architecture.md — 架構細節與設定

> 快速規則見 [`AGENTS.md`](./AGENTS.md)。本文件是完整說明與可直接複製的設定檔。

---

## 0. 技術棧總覽

| 類別              | 選擇                                               | 備註                                          |
| ----------------- | -------------------------------------------------- | --------------------------------------------- |
| 框架              | React 19.x + Vite                                  | 開啟 React Compiler,減少手動 memoization      |
| 語言              | TypeScript(先關閉 strict,後續逐步開啟)             | 見第 6 節                                     |
| UI 元件庫         | Ant Design                                         | 優先使用 antd 現成元件,避免重造輪子           |
| 路由              | React Router                                       | v6+ 寫法(`createBrowserRouter` / `<Routes>`)  |
| Client 端全域狀態 | Zustand                                            | 只放 UI 狀態(sidebar 開關、theme、跨頁草稿等) |
| Server 端資料狀態 | TanStack Query                                     | API 資料一律走這裡,不放進 Zustand             |
| API 呼叫層        | Axios + 自訂 API client                            | 見第 5 節                                     |
| 表單              | React Hook Form(輕量用法即可,不強制上 schema 驗證) | 需求不多,先簡單處理                           |
| Lint / Format     | ESLint 9(flat config)+ Prettier                    | 強制在 commit 前執行                          |
| Git hook          | Husky + lint-staged                                |                                               |

---

## 1. 資料夾結構

```
src/
  app/                  # 應用程式進入點、Router、Providers 組裝
    App.tsx
    router.tsx
    providers.tsx
  layouts/              # Sidebar、Header 等版面 layout 元件
    MainLayout/
      MainLayout.tsx
      Sidebar.tsx
      Sidebar.module.css
  pages/                # 路由對應的頁面元件(不放商業邏輯)
    Dashboard/
      DashboardPage.tsx
  features/             # 依「功能」切,而非依「檔案類型」切
    theme/
      store/useThemeStore.ts
      components/ThemeToggle.tsx
    user/
      api/userApi.ts
      hooks/useUser.ts
      components/UserCard.tsx
  components/           # 跨 feature 共用的通用元件(Button、EmptyState...)
  hooks/                # 跨 feature 共用的通用 hooks
  stores/               # 跨 feature 共用的 Zustand store(例如 sidebar 開合狀態)
  services/
    apiClient.ts         # Axios instance 與攔截器
  types/                 # 共用型別
  utils/                 # 純函式工具
```

**原則:新功能優先放進 `features/<功能名稱>/`,不要把邏輯散落在 `pages/` 或 `components/`。**
`pages/` 只負責組裝 `features/` 裡的元件與 hooks,盡量不寫邏輯。

---

## 2. Import 排序規則

由 ESLint(`eslint-plugin-simple-import-sort`)自動排序與分組,存檔/commit 前自動修正,**不需要手動排列**,但分組邏輯如下,寫在這裡是讓 agent 理解「為什麼」:

```ts
// 1. React / 外部套件
import { useState } from 'react';
import { Button } from 'antd';

// 2. 內部別名路徑(@/ 開頭)
import { useThemeStore } from '@/features/theme/store/useThemeStore';
import { apiClient } from '@/services/apiClient';

// 3. 相對路徑
import { Sidebar } from '../Sidebar';

// 4. 型別 import(可與上面分組合併,交給 plugin 處理)
import type { UserDTO } from '@/types/user';

// 5. 樣式檔一律放最後
import './App.css';
```

---

## 3. 元件內部結構順序(手動慣例,ESLint 無法強制,靠 review 把關)

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
// src/features/theme/store/useThemeStore.ts
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
// src/services/apiClient.ts
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

**規則:每個 feature 各自的 API function 放在 `features/<功能>/api/`,不要直接在元件內寫 `apiClient.get(...)`。**

```ts
// src/features/user/api/userApi.ts
import { apiClient } from '@/services/apiClient';
import type { UserDTO } from '@/types/user';

export const userApi = {
  getUser: (id: string) => apiClient.get<UserDTO>(`/users/${id}`),
  updateUser: (id: string, payload: Partial<UserDTO>) =>
    apiClient.patch<UserDTO>(`/users/${id}`, payload),
};
```

```ts
// src/features/user/hooks/useUser.ts
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
  - 禁止 `any`(`@typescript-eslint/no-explicit-any: error`),真的需要時用 `unknown` 再收斂型別
  - 函式的參數與回傳值型別盡量明確標註,不依賴推斷
  - API 回應一律定義 DTO 型別(放 `types/` 或 `features/<功能>/types.ts`)
- 待專案穩定、型別覆蓋率提高後,再逐步開啟 `strict: true`(建議下一個里程碑就排入)。

---

## 7. ESLint / Prettier 設定

採用目前(2026)主流做法:**ESLint 9 flat config**,Prettier 只負責格式,不透過 ESLint plugin 跑(避免效能問題與規則衝突),而是用 `eslint-config-prettier` 關掉衝突規則,Prettier 另外獨立執行。

### 安裝套件

```bash
npm install -D eslint @eslint/js typescript-eslint globals \
  eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh \
  eslint-plugin-simple-import-sort eslint-plugin-jsx-a11y \
  eslint-config-prettier prettier \
  husky lint-staged
```

### `eslint.config.js`

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended, // 專案穩定後可升級為 recommendedTypeChecked
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'simple-import-sort': simpleImportSort,
      'jsx-a11y': jsxA11y,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react-refresh/only-export-components': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'warn',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  prettierConfig, // 一定放最後,關掉會跟 Prettier 打架的格式規則
);
```

### `.prettierrc.json`

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "endOfLine": "lf"
}
```

### `.lintstagedrc.json`

```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{css,less,json,md}": ["prettier --write"]
}
```

### Husky 設定

```bash
npx husky init
echo "npx lint-staged" > .husky/pre-commit
```

這樣設定後,任何人(或任何 agent)寫的 code,只要進 commit 就會被自動格式化與 lint 修正,風格差異在進 repo 前就會被拉齊。
