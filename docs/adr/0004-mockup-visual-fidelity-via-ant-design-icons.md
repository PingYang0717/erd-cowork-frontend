> **狀態註記(2026-08-27)**:適用範圍被 [ADR-0010](0010-chat-panel-presentation-follows-cowork.md)
> 收窄——chat panel(對話串區域)的呈現語彙改以 cowork 上游為準,其餘畫面本文不變。

# 視覺、排版、圖示嚴格對齊 `eRDWorkspace20260819.html`，圖示改用 `@ant-design/icons`

先前的定案（`spec.md`「Further Notes」）只把原始設計稿 `eRDWorkspace20260819.html` 與 `project.png` 定位為「視覺與互動行為的主要參考來源」。實際開發到 ticket 08 時發現這個定位太鬆：Session rail 收合後應該是設計稿裡那種完整的 icon-only rail（展開鈕、New chat、Schedule、Artifacts 等圖示 tile），但因為沒有明確要求「必須」對齊，做出來的只是一顆顯示純文字字元 `»` 的陽春按鈕，跟其他幾個地方（theme toggle 用 emoji 🌙/☀️、more-actions 用文字 `⋯`）一樣，用文字/emoji 頂替了設計稿裡實際存在的圖示。

現在明確加嚴這條規則：**整個專案的 style、排版、圖示都必須對齊 `eRDWorkspace20260819.html`**，不是「參考」而是「必須符合」。這包含既有版面的間距、收合行為等排版細節，也包含每一個圖示的選用。

## 圖示庫選擇

設計稿內部用 `Y(t, e)` 這個 helper 把圖示字串（例如 `"ant-design:menu-fold-outlined"`、`"ant-design:pushpin-outlined"`）透過 Iconify 的 `ant-design` 圖示集渲染成 SVG，並在檔案內用 `vT(cN)` 整包內嵌註冊該圖示集資料（因為設計稿是離線單檔 HTML，只能這樣打包）。

Iconify 的 `ant-design` 圖示集本身就是 Ant Design 官方圖示的鏡像，而我們的技術棧本來就用 Ant Design（antd）當 UI 元件庫，其官方圖示套件 `@ant-design/icons` 提供完全相同的一套圖示，包成 React 元件（例如 `MenuFoldOutlined`、`PushpinOutlined`、`ArrowUpOutlined`），不需要額外整合 Iconify 或搬運設計稿內嵌的圖示資料。因此決定：**圖示一律用 `@ant-design/icons` 的對應元件**，命名規則是把設計稿的 `ant-design:xxx-outlined` / `ant-design:xxx-filled` 轉成 PascalCase 元件名（`xxx-outlined` → `XxxOutlined`、`xxx-filled` → `XxxFilled`）。已加入 `package.json` 的直接依賴（原本只是 antd 的間接依賴）。

`@ant-design/icons` 沒有的圖示（目前沒遇到,若遇到再個案處理),不應該用文字符號或 emoji 頂替。

## 影響範圍

這條規則回溯套用到已經標記 done 的 ticket 03、06、07、08：theme toggle、Session rail 收合、Session 列表的 New chat／more-actions／Pin／Rename／Delete、Chat composer 的送出鈕、AI 訊息的圖示徽章，都要換成對應的 `@ant-design/icons` 元件並比對設計稿的排版細節（例如收合 rail 寬度改回設計稿的 52px、送出鈕改成純圖示的圓形按鈕）。之後每張新票驗收時,除了功能 AC,也要拿設計稿核對視覺與圖示是否一致。
