# 0010. 元件的宣告與匯出只有一種形式

日期:2026-08-28

## 背景

專案累積下來的元件同時存在好幾種寫法。匯出有三種:`export { X }` 與 `export default X`
並存(32 個檔案)、只有 default、只有具名;宣告有兩種:`const X: React.FC<Props>` 與
`function X(props)`。

匯出的並存是一次刻意的折衷:當時要讓每個檔案以 `export default` 結尾,但所有呼叫端都是
具名 import,改成 default-only 得重寫約 150 個站點,於是兩種都留著。折衷成立,但代價在
之後才顯現——同一個元件在不同呼叫端以兩種寫法出現,而且沒有任何機制保證兩者同步。實測
盤點時,那 32 個 `export default` 竟然**一次都沒有被用過**:43 個 import 站點全是具名。

宣告的分歧則是層次上的:被匯出的主元件多半已是 `React.FC`,而檔案內的子元件
(`StepRow`、`FilterPill`、`SessionRow`……共 22 個)幾乎都還是 `function`,props 直接
inline 在參數上。

## 決策

**匯出:元件一律 `export default <元件名>`,不併存具名匯出。**

兩個例外,都不是「元件的匯出」:

- **跨檔使用的子元件**維持具名——目前只有 `SessionList.tsx` 的 `SessionGroup`
  (`CollapsedSessionRail` 在用)。
- **同檔的型別**維持具名(`MessageBubbleProps`、`LiveRun`、`Answers`)。型別跟著它描述
  的元件走比較好找,不搬去 `types/`——那裡放的是後端 DTO(ADR-0003 的逐字契約),混進
  UI 內部型別會弄髒那個邊界。

**檔案切分:依用途,不依行數。** 子元件獨立成檔,只在下列任一成立時:

1. **被一個以上的父元件使用**——共用是檔案存在最直接的理由。
2. **它是 `React.lazy` 或 `React.memo` 的邊界**——此時「獨立成檔」本身就是機制的一部分,
   不是整理。`MarkdownBody.tsx` 之所以是獨立檔案,正是因為 `React.lazy(() => import(…))`
   要有一個模組可以指向;把它合併回去等於撤銷那次分包。
3. **它長到會淹沒主元件**,或帶有自己的生命週期(計時器、訂閱)。

三者皆不成立就跟在唯一的呼叫端旁邊。**行數不是判準**,行數只是症狀:190 行的
`SessionRow` 該抽出來是因為它是一個自帶三個 mutation 與編輯模式的獨立互動面,不是因為
它有 190 行;而 12 行的 `ThinkingPanel` 該收回去是因為它只是把 `CollapsiblePanel` 轉手
一次,不是因為它短。

**匯入:同一個模組只出現一行。** 型別與值合併寫成 `import React, { type ReactNode,
useState } from 'react'`,不分兩行。

**宣告:一律 `const X: React.FC<XProps> = (props) => {}`**,包含檔案內的子元件。

- props interface 命名 `<元件名>Props`,**宣告在該元件正上方**,不匯出(除非跨檔用)。
  與主元件既有的慣例一致,而且子元件與它的 props 相鄰最好讀。
- **無 props 的元件寫 `React.FC` 不帶泛型**,不造空 interface。
- **`ErrorBoundary` 是唯一的例外,它必須是 class**:React 沒有 `componentDidCatch` 的
  hook 對等物。

## 後果

- 43 個具名 import 站點(含 18 個測試檔)改寫成 default import。動態 `await import()`
  的解構也一併改成 `{ default: X }`。
- 22 個子元件多出 18 個只有一處使用的 interface(4 個無 props 的不需要)。這是為了單一
  形式付的價;好處是子元件的 props 從此可讀、可被 IDE 提示,而不是擠在參數列裡。
- `function` 有 hoisting、`const` 沒有。實務上不受影響:子元件的引用都在其他元件的
  render body 裡,執行時機晚於模組初始化。真的寫出模組層級的前向引用時,TypeScript 會
  當場報 block-scoped 錯誤,不會留到執行期。
- 未來若要引入 `React.lazy()`(目前沒有),default 匯出正好是它需要的形式。

## 補充(2026-08-31):檔案切分與匯入

先前只規範了宣告與匯出形式,沒有規範「何時該獨立成檔」,結果兩頭都跑:有 20 行的獨立檔
(`ThinkingPanel`),也有 426 行塞了 6 個元件的檔(`MessageBubble`)。上面的三條規則補上
這個缺口。依此調整的結果:

- `MessageBubble` 426 → 285 行。`StepStatusIcon` / `StepRow` / `StepsRecap` 抽成
  `StepList.tsx`(一個單位、一件事,在兩個時機被用到);`LiveElapsed` / `Elapsed` 抽成
  `Elapsed.tsx`(其中一個自帶 interval)。兩者的 CSS 一併搬走,原本沒有任何共用的 class。
- `SessionList` 306 → 156 行,`SessionRow` 獨立。CSS **刻意**留在
  `SessionList.module.css`:列與清單共用側欄的視覺語言,拆開會把該一起讀的規則分開。
- `ThinkingPanel` 收回 `MessageBubble`——它只是把 `CollapsiblePanel` 轉手一次
  (Middle Man),而 `CollapsiblePanel` 除了它沒有別的使用者,鏈上三層各只有一個使用者。
- 10 處分成兩行的同模組匯入合併成一行。

**沒有動的**:`MarkdownBody`(lazy 邊界)、`ReplyText`(memo 邊界,有測試斷言
`$typeof`)、以及所有被兩個以上檔案匯入的小元件。它們短,但短不是問題。

## 補充(2026-09-04):元件內部的宣告排列

先前這條規則只活在 AGENTS.md 的鐵律 #5(`hooks → useState → useRef → 衍生值 → useEffect
→ event handler`),而它有兩個缺口。一是**「hook」這個詞涵蓋了 useState 自己**,所以「hooks
排前面、useState 排後面」實際上無法判讀,不同人會排出不同結果。二是它預設同型別的宣告可以
集中,但 `ThreadPanel` 這類元件是「衍生值緊貼唯一消費它的 effect」寫的——集中會拆散那些配對,
而罩著配對的註解會失去指涉對象。

**一、頂部放不是從 `react` 匯入的 hook。** 判準是語法,不是語意:看 import 行寫不寫得出來。
`useTranslations`、`useSessionDetail`、`useAgentStream`、`useRepairOfferStore(...)`、
`useArtifactRepair` 都在這一組;`useState` / `useRef` / `useMemo` / `useEffect` / `useCallback`
不在。之所以不用「有沒有去拿外部資料」這種語意判準,是因為它有灰帶——`useDebouncedValue` 是
自訂 hook 但純本地計算,`useHorizontalDrag` 碰 DOM 事件但不取資料,兩個都會在 review 上吵起來。
語法判準沒有灰帶。

同一個來源的多個 selector 視為一個子塊,塊內與塊間都按行長升冪排,塊之間空一行。

**二、接著是 React 內建的 hook**,依 `useRef` → `useState` → `useMemo` → `useEffect` →
`useCallback` 分組,組間空一行。

**三、衍生值與唯一消費它的 effect/callback 是一個不可拆的單元**,整個單元依它的型別歸位。
`const streamedArtifact = state.artifact;` 與發布它的 `useEffect` 之間不插入別的東西,罩在
上面的註解才有指涉對象。同理,**只有一個消費者的 `useRef` 跟著那個消費者走**——第二點裡的
`useRef` 只管沒有唯一消費者的 ref(例如多處共用的 DOM ref)。

**四、依賴是硬約束,長度升冪只是 tiebreaker。** `handleAnswer` 依賴 `handleSend`、`hasContent`
依賴 `live`,這些順序不管長度都不能換。長度只在兩個宣告之間沒有依賴關係時才決定先後。

**五、只給 render 用的純衍生值(不是 `useMemo` 的)緊鄰 `return`。** 它們是 JSX 的輸入,離
使用處近比離同類近重要。

### 為何不是純型別分組

純型別分組(所有 `useState` 一起、所有 `useEffect` 一起)規則更簡單,但它會把上面第三點的配對
全部拆散。以 `ThreadView` 為例,那裡有四組「衍生值 + 它唯一的 effect/callback」,每一組都有一段
註解解釋這個同步為什麼必要;拆散之後那段註解要嘛跟著值走(但它解釋的是 effect)、要嘛跟著
effect 走(但它開頭講的是那個值)。用可讀性換規則的簡單,在這個檔案上是虧的。

### 後果

- **沒有 lint 能強制這條規則**,oxlint 與 ESLint 都沒有對等能力。它靠 code review 把關,
  所以推廣速度取決於有多少人記得。
- 目前**只有 `ThreadPanel.tsx` 依此排列**,作為可以指著看的範本。其餘 23 個含 3 個以上 hook
  呼叫的元件維持舊排列,倉庫在推廣完成前會有兩種風格並存。
- **重排 `useEffect` 會改變執行順序,以及反序的 cleanup 順序。** 只有在確認彼此沒有隱性先後
  (一個寫 store、另一個讀)時才可以動。`ThreadView` 的四個 effect 寫的是不同的 store 欄位,
  重排後 377 個測試全過。往後套用到其他檔案時,這個確認要逐檔做一次,不能假設。
