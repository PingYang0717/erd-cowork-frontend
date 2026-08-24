# 14: live 模式接線與端點覆蓋表

**What to build:** The same UI can talk to a real backend instead of MSW.

**Blocked by:** 04

**Status:** ready-for-agent

- [x] build-time 環境變數決定傳輸模式；mock 模式才註冊 MSW（不讓 MSW 進 production bundle）
- [x] live 模式下 `agentApi` 打真實後端；DTO 差異（`sender` vs `role`、`stepsJson` / `questionsJson` 字串 vs 真陣列）在 `agentApi` 層做 adapter，UI 與型別不受影響
- [x] `docs/api/interface.md` 的 live 模式端點覆蓋表：session / message / artifact HTML / file / config 走真後端；Artifacts 總覽清單與釘選、分享、Directory、Schedule、Connectors、Artifact 版本清單仍由 MSW 服務
- [x] README 補上兩種模式的啟動方式
- [x] Seam test：以環境變數切換，斷言 mock 模式註冊了 MSW、live 模式沒有；adapter 的雙向轉換有單元測試

## Comments

**2026-08-25:** 完成，但實作時發現一個必須往上報的契約落差。

**QUESTION 是唯一形狀不同的事件。** 其餘八種在兩邊逐欄一致（這正是事件名維持
SCREAMING_CASE 的用意），但既有後端送的是 `{ questions: Question[] }`，其中
`Question = { text, options: string[], multiSelect }`——沒有欄位種類、沒有欄位相依、
選項是裸字串、答案是組成一段自然語言送回。

`toQuestionForm()` 能把它抬升成可渲染的表單，但只有這個方向可行且會失真。**要驅動
分析條件表單，後端必須改成送 `QuestionForm` 本身**；在那之前 live 模式的反問只能退化
成一排 chip，`design-diff.md:17` 描述的三張表單渲染不出來。已寫進
`docs/api/interface.md`。

**MSW 在 live 模式仍然註冊**，只是不攔截後端真的有實作的那幾條。原本的 AC 寫「mock
模式才註冊 MSW」，那是錯的——live 後端不覆蓋 Artifacts 總覽、分享、Directory、
Connectors、DC item、Artifact 版本，全部拿掉的話那些畫面會直接壞掉。
