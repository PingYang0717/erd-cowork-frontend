# 0008. DataBoundary 放在每個窗格,而不是 app 頂層包一層

日期:2026-08-28

## 背景

主要資料抓取一律用 `useSuspenseQuery`,呼叫端因此沒有 `isLoading` / `isError` 分支——
pending 狀態由 Suspense 邊界顯示、失敗由 ErrorBoundary 接住。問題是那兩個邊界要放在
哪一層。最省事的做法是在 `App` 外面包一組,整個 app 共用。

## 決策

**`DataBoundary`(`ErrorBoundary` + `SuspenseLoader` 的組合)包在每個窗格與每個 page
上,不在 app 頂層包一層。** 目前的落點:Studio 的 Sessions / Thread / Artifact 三欄、
`StudioShell` 的 Content、以及 Artifact 全頁與 Gallery 兩個 page。每個都帶一個 `label`
描述這塊區域是什麼,pending 與 failed 兩種狀態都用得上。

兩個理由:

1. **失敗要被關住。** 一個壞掉的 Artifact 不該把旁邊的對話串一起弄白。頂層單一邊界的
   語意是「app 的任一處失敗 = 整頁失敗」,那不是這個三欄畫面該有的行為。
2. **測試要拿得到邊界。** 直接 render 單一窗格的測試(數量遠多於 render 整個 app 的)
   若邊界在頂層,那個窗格一 suspend 就沒有 fallback,測試會炸在 React 的錯誤而不是
   在斷言上。

Mutation 的錯誤走 `onError` callback,不經過這裡——它不是 render 期的例外,
ErrorBoundary 接不到。

## 後果

- 新增一個會抓資料的窗格時,要自己補一個 `DataBoundary`,沒有頂層網子兜底。
- 同一頁可能同時出現多個 loading 狀態(三欄各自 pending),這是刻意的:每欄的資料
  各自到達,沒有理由讓最慢的那欄決定整頁何時可用。
- `ErrorBoundary` 是專案裡唯一的 class 元件——React 沒有 `componentDidCatch` 的 hook
  對等物。
