# 0002. 視覺權威是設計稿,但 chat panel 改以 cowork 上游為準

日期:2026-08-28

## 背景

專案有兩份可以當視覺基準的東西:UI/UX 設計稿(不在 repo 內,見文末 2026-09-16 追記),以及
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

**2026-09-08 追記。** 上面「跟過去的(呈現)」清單裡的 `ResultTable` 已經不存在——後端不再
送 TABLE 事件,前端整條渲染路徑一併移除。決策本身沒有變(chat panel 以 cowork 為準),
變的只是那份清單少了一項,依慣例保留原文而不改寫。

**2026-09-15 追記:設計稿換了。** 視覺權威改為新版設計稿,取代舊版。新設計稿來自
`https://github.com/Orangeyes26/erdcowork`(commit `2b0457e`,2026-09-14),是一份打包後的
單檔 React 成品而不是原始碼——樣式全是 inline style、圖示走 Iconify 的 `ant-design` 集;
「圖示一律用 `@ant-design/icons`、色票經 `tokens.ts`」的落地方式不變,兩份設計稿的
`:root` 色票值相同。

兩份設計稿最大的差別是**沒有 Workspace 外殼了**:舊稿的 56px 頂欄屬於 eRD Workspace
平台(品牌字「Workspace」,有收合鈕、搜尋、通知),新稿把它縮成 Cowork 自己的
header——品牌區「eRD Cowork / R&D platform」加一顆頭像,語言與主題收進頭像選單。
eRD Workspace 這個平台已不存在(CONTEXT.md 同日改寫)。

這一輪只對齊 header(`AppHeader`,掛在所有路由之上的 `AppShell`);其餘區域與新稿的
差異留待之後逐區比對。chat panel 以 cowork 上游為準的例外不變。

新稿寫死頭像縮寫「KL」,本專案改讀 `GET /hr/userInfo`——登入者的 `DirectoryEntry`,
相片與首字退回跟分享對話框的收件者同一套(`EmployeeAvatar`)。拿到之前或拿不到時放通用
的使用者圖示:寫死一組縮寫就是執行時的假資料(ADR-0006)。

**2026-09-15 追記:節慶裝飾是刻意的例外。** header 在中秋、萬聖節、聖誕節前 14 天到
當天後 1 天會加上裝飾(`FestiveDecoration`:中間是一幅連續的場景帶——天色、遠景與中景兩層
剪影緩慢平移做視差、一條沿弧線橫過頂端的掛串(燈籠／三角旗／小燈泡)、近景一組靜物立在
底線上、右端一枝斜進來的植物,三個節慶共用這套配置;整幅畫一起動而不是各個圖案各自晃;頭像
聖誕戴帽、萬聖被南瓜的嘴包住、中秋不動)。這是整個畫面上**唯一不在設計稿上的東西**,自家加的,
不是對齊差異——拿設計稿核對 header 時要把它排除。它不動任何設計稿元件的位置,只用原本
空著的中間區與頭像上方;圖案用 inline SVG 而不是 emoji,理由與圖示規則相同(跨平台一致、
能配深色)。**不看 `prefers-reduced-motion`**:原本設計是系統要求減少動態就靜止,但開發機的
瀏覽器回報 `reduce` 而系統設定是關的、來源查不到,結果看起來像動畫壞了;圖案小、慢、
又不在視線焦點上,決定一律播放(2026-09-15)。**開關在頭像選單裡**(2026-09-16 決議):跟語言、
主題並列的第三列,預設開、記在本機(`useFestiveStore`),關掉就什麼都不畫,日期與預覽鍵都不
再過問。曾短暫做過「只在指定 host 上出現」的 mock 清單,同日拿掉——要不要裝飾是使用者的事,
不是部署的事。預覽用 localStorage 鍵
`erd-cowork:festival-preview`。中秋日期是寫死的年度表(2026–2030),有測試在表的最後一年
會失敗提醒補表。**2026-09-16 加農曆新年**:同一套配置(紅燈籠串、鞭炮、舞龍剪影、梅花瓣飄落),頭像戴瓜皮帽;日期同樣是年度表(2026–2030),同樣有到期提醒的測試。**同日加上節制的動態**:每個節日一個「過客」橫越畫面再出畫等候(聖誕雪橇、萬聖女巫、中秋雁群、新年舞龍),掛著的東西(燈籠、旗、流蘇、鞭炮)以頂端為軸微微擺動,加三個小點綴(小屋煙囪冒煙、蝙蝠拍翅、鞭炮火花)。落地的東西仍然不動,一次只有一個東西在走——「整幅畫一起動」的原則沒有變,只是畫裡多了一個會走的角色。

**2026-09-16 追記:設計稿不再放進 repo。** 兩份設計稿(新版與它取代的舊版)都是 UI/UX
打包後的單檔成品,裡面連同 mock 資料一起帶著不適合進入版本控制的內容。兩個檔案已從工作樹
與整個 git 歷史移除,由團隊在 repo 外保管;`.gitignore` 擋著,避免哪天又被 `git add .` 掃進來。

**決策本身不變**:視覺權威仍然是設計稿,不是「參考」而是必須符合的基準,chat panel 以
cowork 上游為準的例外也不變。變的只是**取得方式**——要核對版面、間距或色票時,向團隊要那份
檔案在本機開,不要指望 `git show` 或 git 歷史找得到。本文與 `architecture.md`、
`tokens.ts`、各處註解裡原本寫著檔名與行號的地方一併改掉了:那些座標現在指不到東西,留著只會
害人白找。

**2026-09-17 追記:Artifact iframe 內的 scrollbar 也要對齊。** 全域的 9px scrollbar 到
iframe 邊界就停了——iframe 是另一份文件,外面的樣式表過不去,結果 chat panel 用設計稿的細
bar、旁邊的 Artifact 用瀏覽器原生的粗 bar。現在把同一組規則當 `<style>` 寫進 Artifact 的
`<head>` 末尾(`injectScrollbarStyle`,跟 CSP 的 `injectCspMeta` 同一條路)。thumb 用中灰
低透明度而不是主題 token:iframe 讀不到父頁的主題,頁面底色是 agent 自己決定的,而切主題就
重灌 iframe 會把 dashboard 打掉重來。

**2026-09-17 追記:Session 列表呼應 header 的節慶裝飾。** 同一段日期、同一個開關,列表在三個
設計稿留白的位置接上 header 的畫(`SessionRailFestive`):Artifacts／Skills 下面那條分隔線換成
header 頂端的掛串(同一組燈籠、三角旗、小燈泡、紅燈籠,縮小,擺動相位跟上面同步);header 天上落
的東西(雪、梅花瓣;中秋的天燈是往上升)從列表頂端接著落,112px 內淡到沒有;列表最底下保留 40px
放幾件 header 近景的靜物。萬聖節 header 沒有東西在落,列表也就沒有。地面那一塊是唯一佔空間的:
刻意保留而不是畫在列後面,列滾過雪人看起來像壞掉。收合的窄欄只有短掛串和一件靜物。圖案是
`festiveMotifs` 裡的同一組路徑,header 自己的場景仍保留手擺的內嵌版本。原則不變:只用空著的
地方、不移動設計稿元件、落地的東西不動。

**同日追記:地面會回應使用者。** header「落地的東西不動」的規則在側邊欄地面改成「平常不動,碰它才動」:游標滑到地面那一塊,每件靜物做一次小動作就回原位(雪人帽子翹一下、樹燈閃快、南瓜臉亮、貓甩尾眨眼、兔子豎耳、燈籠亮、紅包彈一下、橘子晃、元寶閃);點到某一件播一段一次性的大動作(跳、搖、貓跑出畫面再回來、橘子滾一圈、月餅翻面)加上飛出來的東西(雪、金幣、「福」字),播完站回原位。另外地面也有 header 那種「過客」:一個節日一個角色(馴鹿、黑貓、兔子、舞獅)走過地面再出畫等候。互動只走滑鼠,不進 Tab 順序,對讀屏軟體仍是隱藏的裝飾,app 沒有任何行為依賴它。
