# Chat panel 對齊 cowork 上游

Status: ready-for-agent

比對基準：`https://github.com/Michelle12369/cowork.git` HEAD `5ca03f2`（frontend/）。
定案過程見 grilling session 2026-08-27；權威邊界由 ADR-0010 記錄。

## 範圍

chat panel 的**呈現語彙**以 cowork 前端為準；**互動與領域功能**維持本專案
（schema-driven QuestionForm、scenario chips 直送、訊息層附件、Thinking 獨立面板、
手刻 StepRow/StepsRecap、步驟展開判斷）。

## 工作項

1. Token 擴充：chat 表面 token（泡泡 #f3f4f6、code/pre 底 #e5e7eb、表頭/斑馬紋
   #f9f9fa 級、框線），深色值依既有 6%/3% 白階梯；scrollbar thumb 入 token。
2. 底色：thread 捲動區與空狀態改 bgContainer 白底；泡泡改不透明；Artifact 面板不動。
3. 字形：@fontsource-variable/inter + @fontsource/noto-sans-tc，FONT_FAMILY 全域換
   cowork 堆疊；泡泡字級 14px。
4. 表格：ResultTable 換 cowork 的 antd Table 實作（>20 列分頁、浮點精度、橫向捲動、
   「(前 200 列)」）；ReplyText markdown 表格斑馬紋 + 框線 + 表頭底色。
5. Artifact chip：恢復可點（沿 0943e4f 的 store 提升路線；revert 屬 Q9(b) 先求穩，
   方向沒問題），style 對齊（w-full、框線、hover）；title fallback slice(0,50)。
6. show HTML：Code icon 在左、chevron 在右、深一級灰底 pre、max-h 320px，label
   「查看 HTML」／「產生中的 HTML」。
7. 文案：chat panel 內全面中文（已停止生成、連線中斷，請重新送出一次、載入中…）。
8. Scrollbar：全域 9px、thumb 14% 黑（深色取對應 token）、radius 5px。
9. 文件：ADR-0010、cowork-master-comparison §6/§7 清單更新、ADR-0001 CSP 狀態註記、
   CONTEXT.md 補「保留期」。

## 驗收

npm run lint + npm test 全綠；淺/深兩模式目視核對。
