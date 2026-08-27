# Chat panel 的呈現語彙改以 cowork 上游為準

日期:2026-08-27

[ADR-0004](0004-mockup-visual-fidelity-via-ant-design-icons.md) 把整個專案的視覺權威定為
`eRDWorkspace20260819.html`。本決策收窄它的適用範圍:**chat panel(對話串區域)的呈現
語彙改以 cowork 上游前端為準**(`https://github.com/Michelle12369/cowork.git`,對齊時
HEAD `5ca03f2`),其餘畫面(Session rail、Artifact 面板、Gallery、Schedule……)維持
ADR-0004 不變。

理由:兩份前端接同一個後端、服務同一群使用者。AI 回應的呈現語彙——泡泡底色、表格、
字體、HTML 面板、狀態文案——若兩邊各說各話,使用者會把差異讀成「不同產品」;而這塊
恰好是 cowork 上游打磨最久的區域。mockup 在這塊反而是較舊的參考。

## 邊界:呈現跟 cowork,互動與領域功能維持本專案

跟過去的(呈現):

- thread 區白底、AI 泡泡不透明 gray-100 等效色、泡泡字級 14px
- 字體堆疊 `Inter Variable + Noto Sans TC`(@fontsource self-host,全 app 生效——字體
  無法只換半個畫面)
- `ResultTable` 用 antd Table(>20 列分頁、浮點精度整理、「(前 200 列)」)
- markdown 表格斑馬紋、gray-200 框線、表頭底色
- Artifact chip 是可點的 full-width 卡片,點擊把該版本放回右側面板
- HTML 面板:code glyph 在左、chevron 在右、gray-200 code 區、max-height 320px
- 文案語言以 cowork 為準:**cowork 用中文的字串跟進中文**(⏹ 已停止生成、
  ⚠ 連線中斷,請重新送出一次、查看 HTML、載入中…),cowork 本身是英文的
  (quick chips、placeholder、empty state、Worked through N steps)維持英文
- 全域 scrollbar 取 cowork mockup 的 9px / 14% 黑 / radius 5

刻意不跟的(互動與領域功能,比對記錄見 `docs/cowork-master-comparison.md` §6/§7):

- schema-driven `QuestionForm`(cowork 是扁平 Question[] 組自然語言)
- scenario chips 直送(ADR-0006)
- 訊息層附件呈現、Thinking 獨立面板、手刻 StepRow/StepsRecap
  (功能等價,且本專案的步驟展開判斷比 cowork 的更準)

## 色彩落地方式

cowork 的 Tailwind 灰階不進元件,一律經 `tokens.ts` 新增的 `chat*` token
(`chatBubbleBg`/`chatCodeBg`/`chatStripeBg`/`chatBorder`/`scrollbarThumb`)。cowork 沒有
深色模式;深色值是本專案自定的,對齊既有深色階梯,記在 token 的註解裡。深色模式是本
專案既有承諾,不因對齊而犧牲。

## 代價

- 與 mockup `eRDWorkspace20260819.html` 的 chat 區域從此有意識地分歧;拿 mockup 核對
  chat panel 的視覺不再有效,要拿 cowork 上游核對
- cowork 上游繼續演進時,這裡需要定期重新比對(比對文件的維護成本)
