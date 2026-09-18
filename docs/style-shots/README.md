# 2026-09-18 樣式調整:天氣落地、發布框跳動、深色模式

對應 feat/iframe-postmessage 上的 commit「天氣改落在地面上;發布後的框會跳動;深色模式三處看不清的修掉」。
`before-*` 是改之前。

## 1. 天氣改落在地面上

之前:`before-weather-top-dark.png`(三個面頂端各自飄雪)。

現在天氣貼在每個面底部,離地 112px 以上淡掉,落進地帶:

- `weather-christmas-light.png` / `weather-christmas-dark.png`(雪)
- `weather-midAutumn-light.png` / `weather-midAutumn-dark.png`(天燈從地面升起)
- `weather-lunarNewYear-light.png` / `weather-lunarNewYear-dark.png`(梅花瓣)
- `thread-christmas-light.png`:有對話時,雪只在 composer 周圍
- `compact-christmas-light.png` / `compact-midautumn-dark.png`:收合的窄欄

## 2. 發布後的框會跳動

側邊欄 Artifacts 列(coach):`coach-rest-*.png` 是框靜止時,`coach-peak-*.png` 是暈漲到最大時(每 1.6s 一次)。
之前的深色:`before-coach-dark.png`(框幾乎看不見)。

Gallery 剛發布的卡片:`fresh-landing-*.png` 是落地前一瞬(從下方 10px 彈上來)、`fresh-peak-*.png` 是框跳到最大、
`fresh-rest-*.png` 是跳完停住(6 秒後整個框淡掉)。之前的深色:`before-gallery-fresh-dark.png`。

## 3. 深色模式

`before-studio-dark.png` → `thread-dark.png`:

- Artifact iframe 墊白底:之前右側「SPC — Vt (gate CD)」的字落在深色上看不見
- 泡泡裡的表格有線了(`chatBorder` #303030 → #3b3b41)
- 發布後的框改用看得見的藍(`highlightRing`)
