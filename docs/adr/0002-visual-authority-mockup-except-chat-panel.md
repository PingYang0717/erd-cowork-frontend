# 0002. 視覺權威是設計稿,但 chat panel 改以 cowork 上游為準

日期:2026-08-28

## 背景

專案有兩份可以當視覺基準的東西:UI/UX 設計稿 `eRDWorkspace20260819.html`,以及
cowork 上游前端(`https://github.com/Michelle12369/cowork.git`)。兩邊接同一個後端、
服務同一群使用者。

設計稿是離線單檔 HTML,內部用 Iconify 的 `ant-design` 圖示集把圖示字串
(`"ant-design:menu-fold-outlined"` 之類)渲染成 SVG,並整包內嵌註冊圖示資料。

## 決策

**整個專案的樣式、排版、圖示必須對齊設計稿**——不是「參考」而是「必須符合」。這包含
間距、收合行為等排版細節,以及每一個圖示的選用。

**圖示一律用 `@ant-design/icons` 的對應元件。** Iconify 的 `ant-design` 圖示集本來就
是 Ant Design 官方圖示的鏡像,而技術棧本來就用 antd,其官方圖示套件提供完全相同的
一套,包成 React 元件,不需要額外整合 Iconify 或搬運設計稿內嵌的圖示資料。命名規則是
把設計稿的 `ant-design:xxx-outlined` / `-filled` 轉成 PascalCase(`XxxOutlined` /
`XxxFilled`)。**NEVER 用文字符號或 emoji 頂替圖示**——這條規則正是因為曾經出現
`»`、🌙/☀️、`⋯` 這類頂替才寫下來的。

**唯一的例外是 chat panel(對話串區域),它以 cowork 上游為準。** AI 回應的呈現
語彙——泡泡底色、表格、字體、HTML 面板、狀態文案——若兩份前端各說各話,使用者會把
差異讀成「不同產品」;而這塊恰好是 cowork 打磨最久的區域,設計稿在這裡反而是較舊的
參考。

跟過去的(呈現):thread 區白底、AI 泡泡不透明 gray-100 等效色、泡泡字級 14px;字體
堆疊 `Inter Variable + Noto Sans TC`(@fontsource self-host,全 app 生效——字體無法
只換半個畫面);`ResultTable` 用 antd Table(>20 列分頁、浮點精度整理、「(前 200 列)」);
markdown 表格斑馬紋與 gray-200 框線;Artifact chip 是可點的 full-width 卡片;HTML 面板
的 code glyph 在左、chevron 在右、max-height 320px;全域 scrollbar 取 9px / 14% 黑 /
radius 5。文案語言以 cowork 為準——**cowork 用中文的字串跟進中文**(⏹ 已停止生成、
⚠ 連線中斷,請重新送出一次、查看 HTML、載入中…),cowork 本身是英文的(quick chips、
placeholder、empty state、Worked through N steps)維持英文。

刻意不跟的(互動與領域功能):schema-driven `QuestionForm`(cowork 是扁平的
`Question[]` 組自然語言,見 [ADR-0004](0004-scenario-drives-clarification.md))、
scenario chips 直送、訊息層附件呈現、Thinking 獨立面板、手刻的 StepRow/StepsRecap
(功能等價,且本專案的步驟展開判斷比 cowork 的更準)。

## 色彩落地方式

色票唯一來源是 `src/theme/tokens.ts`,逐值抄自設計稿的 `:root` /
`:root[data-theme="dark"]`。不要在元件裡寫死顏色,也不要依賴 antd 演算法的預設值——
它的 dark 表面色(`#000000` / `#141414` / `#1f1f1f`)與設計稿(`#17181c` / `#1f1f22` /
`#262629`)並不相同。

cowork 的 Tailwind 灰階同樣不進元件,一律經 `tokens.ts` 的 `chat*` token
(`chatBubbleBg` / `chatCodeBg` / `chatStripeBg` / `chatBorder` / `scrollbarThumb`)。
cowork 沒有深色模式,那幾個深色值是本專案自定的,對齊既有深色階梯,理由記在 token 的
註解裡——深色模式是既有承諾,不因對齊而犧牲。

## 後果

- 與設計稿的 chat 區域從此有意識地分歧:拿設計稿核對 chat panel 不再有效,要拿 cowork
  上游核對。
- cowork 上游繼續演進時,這裡需要定期重新比對。
- 每張新票驗收時,除了功能 AC,也要拿設計稿核對視覺與圖示是否一致。
