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
