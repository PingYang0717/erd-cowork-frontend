# 導入 React Router，即使原始 mockup 是純 state 切換

UI/UX 設計稿 `eRDWorkspace20260819.html` 是一個完全靠 `nav`／`cwView`／`cwArtifactTab` 等 state 旗標切換畫面的單頁應用，沒有使用任何路由函式庫，重新整理頁面會遺失目前所在畫面。我們刻意不比照這點，改為導入 React Router，讓 Studio、Artifacts 總覽、Schedule、以及個別 Artifact 都對應各自的 URL（例如 `/cowork`、`/cowork/artifacts`、`/cowork/schedule`、`/cowork/artifact/:artifactId`）。

這是刻意的偏離：真實路由讓重新整理不遺失畫面、也讓特定 Artifact 可以被分享連結直接開啟，且 `architecture.md` 本來就已將 React Router 列為技術棧鐵律。之後若有人對照原始 mockup 檔案，發現路由行為不同，屬於預期中的差異，不是實作疏漏。
