# 0014. 無障礙互動契約

日期:2026-09-04

## 背景

這份文件把先前散在程式碼裡的 `(A-1)`…`(A-6)` 代號收編成正式決策。

那組代號來自一次個人開發時期的無障礙盤點,被引用了 32 次、散在 18 個檔案,**但倉庫裡
從來沒有任何地方定義過它們**。`docs/adr/` 沒有 A-1 這份文件,也沒有 legend。對當時的
作者它是有效的索引,對接手的人它是死連結:看到 `(A-2)` 只知道「這裡有個講究」,不知道
講究是什麼、還有哪些地方遵守同一條。

同時這些代號標記的內容全都不是可有可無的註腳——它們是**跨檔案的契約**。A-1 同時約束
`ThreadPanel` 的 sr-only 區域與 `MessageList` 的 `role="log"`,兩邊必須一致才成立;A-2
同時約束 `SettingsMenu` 與 `VersionSwitcher` 兩個觸發器。一個跨 18 檔、被反覆引用的約定,
正是 ADR 存在的理由。

## 決策

以下六條是本專案的無障礙互動契約。每一條都有對應的英文小節名,程式碼註解以
`(ADR-0014 §<小節名>)` 引用,`grep` 小節名可以一次找齊所有遵守它的地方。

### live-region:thread 靜音,完成的回覆只播報一次

對話串本身 `aria-live="off"`。`MessageList` 的 `role="log"` 隱含
`aria-live="polite"`,那會讓串流中的**每一個 token 都被重念一次**,所以它被明確關掉。

完整的回覆改由 `ThreadView` 裡一個專屬的 sr-only `role="status"` 區域播報,一次執行只
設定一次內容——螢幕閱讀器聽到的是完整答案一遍,不是逐字一遍。串流結束後這是唯一還開著
的播報通道。

### step-announcements:步驟逐條播報,不重念整個面板

步驟面板的 `role="status"` 隱含 `aria-atomic="true"`,那會讓每追加一個步驟就重念整面板。
以 `aria-atomic="false"` 覆蓋掉,新到的步驟列各自播報。

### menu-keyboard:menu 的鍵盤契約與合法子節點

觸發器要帶 `aria-haspopup` 與 `aria-expanded`——antd 對自訂 child 不會補,而閱讀器必須
聽得出這個東西會開一個面板。開啟時焦點落在當前項目,方向鍵在項目間移動,Escape 關閉並把
焦點交還觸發器。

**`role="menu"` 的子節點只能是項目。** 標題 div 是非法子節點,某些閱讀器會因此整個略過
這個 menu,所以標題必須放在 popup 內、但在帶 `role="menu"` 的元素**外面**。

遵守這條的有 `SettingsMenu` 與 `VersionSwitcher` 兩個觸發器。

### dialog-focus:flyout 是真的 dialog

宣告 `role="dialog"` 就要負起 dialog 的責任:開啟時自己接住焦點(否則鍵盤使用者還站在
backdrop 後面的按鈕上)、Escape 關閉、關閉時把焦點**交還給開啟它的按鈕**、Tab 在內部循環
而不是逃到背後的頁面。

焦點掉回 `<body>` 在三欄式版面裡等於整個位置丟失,這是這條契約最主要的理由。

### divider-keyboard:分隔線可以用鍵盤移動

窗格分隔線不是只給指標用的。它以 `aria-valuenow` / `aria-valuemin` / `aria-valuemax`
報出目前邊界位置與可移動範圍,讓閱讀器聽得出「在哪、還能移多少」。

**一次按鍵就是一次完整的拖曳**:夾限與寫回 store 都在同一個地方發生,鍵盤路徑和指標路徑
不會各算各的。鍵盤聚焦時 1px 線亮成主色,與 hover、拖曳共用同一套視覺語彙。

### tooltip-focus:聚焦立即顯示,不套用停留延遲

hover 才有 0.35 秒延遲,focus 沒有。延遲是給指標用的防抖——鍵盤使用者移動到這個控制項
本身就已經是明確的意圖,沒有需要防的誤觸。

## 後果

- 32 處 `(A-n)` 改寫成 `(ADR-0014 §<小節名>)`。索引鍵結保留,而且第一次有了著陸點。
- 這六條沒有自動化測試以外的強制力,但它們**都有測試在盯**:`StudioPage.streaming`、
  `StudioPage.test`、`StudioPage.artifact-versions`、`languageSwitch`、`Tooltip.test`
  各自斷言了對應的契約。改動這些元件時測試會擋。
- 代號家族沒有 A-7 以後,也沒有 B-*,因為那份個人清單只用到這裡。之後要新增契約直接
  在這份 ADR 加一個小節,不要再開新的代號體系。
