# ADR-0016：錯誤文案由前端擁有,以後端的 `code` 查表;403 鎖住整個 app

日期:2026-09-07
狀態:已採納(推翻 [ADR-0012](0012-ui-copy-in-a-hand-written-dictionary.md) 的一條、修訂 [ADR-0013](0013-api-response-contract.md))

## 背景

後端的錯誤回應是 `{ code, message }`。在這之前,**`message` 絕對優先**——這條規則寫在四個地方:

- `apiError.ts` 的 `errorMessage`:「The backend's own words win over anything this client would compose」
- `describeLoadError.ts`:「a status code is a poor substitute for a sentence it already wrote」
- ADR-0012 §背景 2:把「錯誤回應的 `message`」列為**不進字典**的三類之一,理由是「前端不擁有」
- `docs/api/interface.md`:「端點還沒落地就把後端的 `{ code, message }` 以 toast 呈現——錯誤訊息就是『還沒 ready』的告知方式」

那條規則在端點還在陸續落地時是對的:那時 `message` 確實是最有資訊量的一句話。現在端點都上線了,而 `message` 實際長成的樣子是
`E11000 duplicate key error collection: erd.sessions index: name_1`、
`total 6442450944 exceeds maxSessionBytes`、
`NullPointerException at SessionService.java:214`——**用伺服器日誌的語彙描述失敗**,那是給維運看的,不是給按下「釘選」的工程師看的。

## 決議

**1. `code` 決定文案,不是 `message`。** 對照表在 `src/i18n/zhTW.ts` 的 `errors.byCode`,key 用 wire code 原樣(SCREAMING_CASE,[ADR-0003](0003-verbatim-backend-wire-contract.md) §5),兩邊比對不需要翻譯表。目前五條:`CONFLICT` / `FILES_EXPIRED` / `PARSE_ERROR` / `UPLOAD_LIMIT` / `UNSUPPORTED_TYPE`。

**2. 未知 code:泛用文案為主,後端原話降級為次要細節。** 錯誤卡是 heading + detail 兩層,後端原話進第三層小字(`describeLoadError` 回傳的 `technical`);toast 只有一行,那行只給我們的文案。對話串的錯誤泡泡是例外——**未知 code 時保留後端 message**,因為那可能是這次執行失敗的唯一說明,而泡泡有空間。

**3. 403 鎖住整個 app,不開 route。** `ACCESS_DENIED`(沒有這個資源的權限)與 `ENTITLEMENT_DENIED`(帳號缺 A4 entitlement)由 `AccessDeniedGate` 蓋一層不可關閉的全屏遮罩,顯示圖案 + **後端的 message**。攔截點是 axios 的 response interceptor 與 `agentApi` 的 `!response.ok` 分支,兩條共用 `noteAccessDenial`。

**4. 404 不再是「後端尚未就緒」。** `describeActionError` 收一個 `notFoundCopy`,由呼叫端說出不見的是什麼(對話 / Artifact / 檔案 / 資料來源);501 才保留原本的措辭。

**5. 未知 code 在 dev 模式 `console.warn`,並補一條涵蓋測試。**

## 理由

**為什麼 403 是遮罩而不是 route。** 遮罩不改網址,所以**重新整理就是重試**——entitlement 補上之後 reload 就自然恢復。route 需要把 message 帶在 navigation state 裡,而 reload 會把它丟掉,留下一個圖案配空白畫面;把 message 塞進網址列則會被複製、進瀏覽器歷史。

**為什麼 403 反而顯示後端的話。** 這是第 2 點的例外,而且是刻意的:`ACCESS_DENIED` 要去找資源擁有者、`ENTITLEMENT_DENIED` 要去 A4 申請,**是哪個資源、哪個 entitlement 只有後端知道**。前端寫得出來的句子一定比它模糊,放上去只會是一個跟正確答案競爭的次等答案。所以 `byCode` 刻意**不**收這兩個 code,`errorCodeCoverage.test.ts` 把這件事斷言下來。

**為什麼攔截 403 連背景 refetch 也攔。** 403 是帳號層級的事實,不是那個剛好撞到它的請求的事實。讓使用者留在原畫面,只是把同一則訊息推遲到後面幾個失敗之後。代價誠實寫在這裡:**正在讀東西的人會被中途鎖住**。

**為什麼對照表進字典而不是獨立模組。** ADR-0012 排除的是「前端不擁有的字串」;`code → 文案`是我們自己寫的句子,前端百分之百擁有,不牴觸原意。進字典白拿三件事:中英雙語、型別對齊、漏翻是編譯錯誤。獨立模組要自己蓋一套語言機制,或者還是回頭引用字典——那只是多一層間接。

**為什麼 404 的文案在呼叫端。** 一個 404 本身只支持「它不在了」。是哪個東西不在了,只有發出請求的地方知道。`backend-feedback.md` 曾要求後端讓 404 一律帶 code(如 `SESSION_NOT_FOUND`);那件事若落地,這些 code 會進 `byCode`,呼叫端的參數就可以退場。

## 代價

- **`useActionErrorToast` 的簽名變了**,10 個呼叫點各自要挑一句 404 文案。挑錯不會有任何錯誤——它只是說錯話。
- **背景 refetch 的 403 會把閱讀中的人鎖住**(見上)。
- **`SameShape` 改成遞迴。** `errors.byCode` 是字典的第三層,而原本的 `SameShape` 在第二層就把非函式的東西壓成 `string`,任何查表都會是型別錯誤。這是整份字典型別的改動,不只影響這一個群組。
- **對照表會落後於後端。** dev 的 `console.warn` 與 `errorCodeCoverage.test.ts` 各接一半:前者接「後端新增了 code」,後者接「前端漏寫」。兩者都不會擋住使用者——未知 code 仍然默默拿到泛用文案。
- **`BROWSER_REPAIR_UNSUPPORTED` 這次不做**(2026-09-07 決定延後),所以它目前落在未知 code 的泛用文案:使用者會看到「操作失敗,請稍後再試」,而不知道這個環境永遠不支援瀏覽器錯誤修復。
- **上傳限制的漂移沒有修。** `uploadValidation.ts` 仍然寫死 5 個檔 / 5 GB / `.csv,.xlsx,.xls`,而 `GET /config` 早已發布 `maxFiles` / `maxSessionBytes` / `singleFileLimits`。`UPLOAD_LIMIT` 與 `UNSUPPORTED_TYPE` 正是這份漂移的產物,這次只給它們文案兜底,見 `backend-feedback.md`。

## 未採納

**逐 code 決定呈現位置(toast / 卡片 / 對話串)。** 對照表只管文案,呈現由呼叫端決定——每個呼叫端的 UI 形狀不同,把兩件事塞進同一張表會讓它同時決定文字和流程。唯一例外是 403 的遮罩,那本來就是全域行為。
