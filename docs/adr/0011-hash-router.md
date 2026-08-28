# 0011. 用 hash 路由,不依賴伺服器的 SPA fallback

日期:2026-08-28

## 背景

設計稿是純 state 旗標切換的單頁 app,重新整理會遺失所在畫面。本專案改用真實路由,換到
兩件事:重整不掉畫面、單一 Artifact 可以用連結直接開(Gallery 的 Copy Link、Artifact
面板的「開新分頁」都在用)。

問題在於用哪一種 history 策略。原本是 `createBrowserRouter`,而 history 路由有一個**寫在
伺服器上、不在這個 repo 裡**的前提:所有路徑都要 fallback 到 `index.html`,否則使用者在
`/cowork/artifact/xxx` 按重新整理就是 404。

這個 repo 沒有任何部署設定——沒有 Dockerfile、沒有 nginx.conf、沒有 rewrite 規則。那個
前提因此是一份沒有寫下來、也沒有人擁有的知識。而這個 app 會掛在 eRD Workspace 底下,
由不一定歸我們管的那層代理服務。

## 決策

**用 `createHashRouter`。** 路由走 fragment(`/#/cowork/artifact/xxx`),伺服器只看得到
`/`,永遠有東西可回,SPA fallback 的需求整個消失。

React Router 的 data router 能力(`loader` / `action` / `defer`)專案一項都沒用——資料全
走 TanStack Query——所以這個選擇純粹是 history 策略,不牽動其他東西。

**離開 app 的連結一律經過 `utils/artifactUrl.ts`。** `navigate()` 由 router 自己補上
`#`,但 `window.open`、剪貼簿、`href` 不會。這是本決策唯一會咬人的地方,而且**咬人時
不出聲**:少了 `#` 的連結指向伺服器沒有的路徑,不是 404 就是落在殼層的首頁,程式裡不會
有任何錯誤。所以路徑組裝收在一支模組裡:`artifactRoute()` 給 router 用,`artifactHref()`
給瀏覽器用。

## 後果

- 部署少一個前提:靜態檔案丟上去就能動,不需要跟代理層協調 rewrite。
- 網址變醜(`/#/cowork/...`),分享到聊天軟體時的預覽與自動連結偵測也較差。這是為了
  部署獨立性付的價。
- 換回 history 路由的話,要改的是 `router.tsx` 一行與 `artifactHref()` 一行——策略只有
  這兩個地方知道。已經流出去的舊連結會失效,那是換回去時要一起考慮的。
- `router.test.tsx` 的 `renderAppAt()` 把 URL 推進 fragment 而非 pathname;推錯的話
  router 會停在 `/`,每個斷言都會在錯的畫面上失敗,而不是在它要測的東西上。
