# 校園報修系統跨 Agent 完整交接提示詞

> 使用方式：把下方「可直接貼給新 Agent」整段複製給 Claude Code、Codex 或 Antigravity。若新 Agent 已能存取本機，可直接叫它先閱讀本檔案：`H:\repair\docs\agent-handoff-prompt-20260730.md`。

## 可直接貼給新 Agent

你現在要接手阿凱老師的「校園智慧報修系統」。請把以下內容視為本次接手的基準，不要要求使用者重新敘述已完成的歷史，也不要重做已完成項目。

### 1. 使用者與回報規則

- 使用者是阿凱老師，任教於「桃園市龍潭區石門國民小學」，簡稱「石門國小」。`smes` 是 Shih Men／石門，絕對不是新明國小。
- 所有進度更新、問題說明、驗收結果與最終回覆一律使用繁體中文。
- 先說結果，再補必要證據；不要把工具內部操作當成主要回覆內容。
- 小型 UI、文案、CSS、版本或單檔小修正，完成並驗證後直接 commit＋push，不必反覆詢問。涉及 schema、Auth、Firebase Rules、Cloud Functions、刪除資料或大範圍重構時，必須先確認範圍並採安全作法。
- 不得輸出、提交或覆寫 `.env`、API Key、服務帳號、Token、學生個資或正式環境匯出資料。

### 2. 專案位置與線上入口

- 本機專案：`H:\repair`
- GitHub：`https://github.com/cagoooo/repair`
- 遠端：`origin = https://github.com/cagoooo/repair.git`
- 預設分支：`main`
- 線上系統：`https://cagoooo.github.io/repair/`
- 線上版本檔：`https://cagoooo.github.io/repair/version.json`
- Firebase 專案：`smes-e1dc3`
- 前端：React 19＋Vite＋Firebase
- 目前應用版本：`v0.13.0`
- v0.13.0 主要功能提交：`f9142de`
- 其後遠端另有 README 導覽文件提交：`1dcb25c`
- 以接手當下的 `origin/main` 為唯一 Git 真實狀態；交接文件本身可能形成更新的 docs-only 提交。

開始前必須先執行只讀盤點：

```powershell
Set-Location H:\repair
git fetch origin
git status -sb
git log --oneline --decorate -5 origin/main
```

若工作樹乾淨且只是落後遠端，才可執行：

```powershell
git pull --ff-only origin main
```

若工作樹有未提交變更，先辨識並保留，不可使用 `git reset --hard`、`git checkout --` 或直接覆蓋。

### 3. 接手後優先閱讀的單一真實來源

依序完整閱讀：

1. `H:\repair\README.md`
2. `H:\repair\PROGRESS.md`
3. `H:\repair\rdq\RDQ-spec-next-repair-roadmap-20260729.md`
4. `H:\repair\docs\115-map-go-live-runbook.md`
5. `H:\repair\package.json`
6. `H:\repair\.github\workflows\deploy.yml`
7. `H:\repair\firebase.json`
8. `H:\repair\firestore.rules`
9. `H:\repair\storage.rules`

若文件與程式碼衝突，以 `origin/main` 的實作及測試為準，並在本次修改中同步修正文件。

### 4. 已完成內容，不要重做

目前 v0.13.0 已完成：

- P0-1：七步驟新學期換版精靈。
- P0-2：發布前完整性檢查與硬性阻擋。
- P0-4：動態管理員可透過受保護 Cloud Function 上傳地圖。
- P0-5：低信心／未辨識教室人工確認佇列。
- P0-6：共用 Firebase Firestore／Storage 規則回歸測試。
- P1-11：上傳圖片後可選擇自動執行一次 OCR 演練；絕不自動發布。
- P1-1：新舊配置圖透明疊圖、左右並排及差異統計。
- P1-3：搜尋、篩選、批次改名／分類／隱藏與一步復原。
- 發布前完整 JSON 快照：包含圖片、教室配置、學期、版本、操作者、稽核摘要與 checksum；未下載快照時禁止發布。
- 「暫不顯示」教室不再刪除，只從公開地圖隱藏，歷史資料仍保留。
- 頁尾版本直接讀 `package.json`；建置流程同步 `public/version.json` 與 `public/sw.js`，不可再次硬編碼版本。
- LINE：未結案報修可由管理員再次提醒對應組長。
- 左上角「校園報修系統」可點擊返回地圖主畫面。

目前正式資料基準：

- 101 間教室。
- 48 筆歷史報修。
- 0 筆失聯報修。
- `C640 幼兒園` 是人工必查教室，不可遺失。

### 5. 尚未完成、必須誠實保留的工作

- P0-3：尚未取得真正的 115 學年度配置圖，因此「實圖 OCR 演練」仍未完成。
- P0-7：快照工具與驗收手冊已完成，但正式環境的「發布／發現異常／還原／再驗證」演練尚未執行。
- P0-8：主要管理員、動態管理員及未授權帳號的正式端到端驗收尚未完成。
- 本機 `http://127.0.0.1` 曾因 Firebase Auth referer 限制無法完成 Google 登入；這不代表正式站登入失敗。P0-8 應在正式 GitHub Pages 網址或已授權網域執行。

除非取得真實圖片與必要帳號配合，絕對不可把以上三項誤標為完成。

### 6. 收到 115 學年度圖片後的第一優先任務

圖片可能是 PNG／JPG，也可為 PDF；清晰圖片優先。拿到圖片後：

1. 先建立工作前快照並記錄目前正式版本、101 間教室、48 筆報修及 0 筆失聯基準。
2. 依 `H:\repair\docs\115-map-go-live-runbook.md` 執行 P0-3。
3. 這一輪先「演練、不發布」；除非使用者明確同意正式發布，不得儲存成正式地圖。
4. 上傳後確認自動 OCR 只觸發一次。Vision API 每位管理員每小時最多 5 次，不得因重渲染或重試意外重複消耗。
5. 記錄 OCR 總數、正確命中、漏判、誤判、低信心、重複編號與空白編號。
6. 必查 W／S 直排廁所編號、密集教室區、圖片邊界教室、`C640 幼兒園`，以及所有有歷史報修的教室。
7. 使用新舊圖疊圖／並排比較，檢查整體比例、偏移、改名與顯示狀態。
8. 需要大量改名時使用批次編輯器，但套用前確認受影響數量，必要時用一步復原。
9. 產出演練報告；把實際結果更新到 `PROGRESS.md` 與 RDQ 驗收文件。
10. 只有零重大錯誤、疑慮逐項確認、完整快照已下載，且使用者明確授權後，才可進入正式發布。

### 7. 重要程式位置

- 應用整合與換版狀態：`H:\repair\src\App.jsx`
- 地圖換版編輯器：`H:\repair\src\components\MapEditor.jsx`
- 上傳與自動演練選項：`H:\repair\src\components\MapUploader.jsx`
- 新舊圖比較：`H:\repair\src\components\MapComparisonPanel.jsx`
- 批次編輯：`H:\repair\src\components\RoomBatchEditor.jsx`
- 發布前檢查：`H:\repair\src\components\MapPublishReview.jsx`
- 公開地圖隱藏教室處理：`H:\repair\src\components\InteractiveMap.jsx`
- 快照服務：`H:\repair\src\services\mapSnapshotService.js`
- 新舊教室差異：`H:\repair\src\services\roomDiffService.js`
- 批次操作：`H:\repair\src\services\roomBatchService.js`
- 發布完整性：`H:\repair\src\services\mapReadinessService.js`
- OCR 合併與人工決策：`H:\repair\src\services\roomConfigService.js`
- OCR／安全上傳 Cloud Functions：`H:\repair\functions-map`
- Firebase 規則測試：`H:\repair\tests\firebaseRules.test.js`

### 8. 測試與品質關卡

標準驗證：

```powershell
Set-Location H:\repair
npm test
npm run build
npm run check:pwa
```

共用 Firebase 安全驗證：

```powershell
npm run test:rules
# 或全部一起
npm run test:safety
```

Firebase Emulator 需要 Java。本機若沒有 Java，不能把規則測試說成通過；可讓 GitHub Actions 的 Java 21 環境執行並查看結果。v0.13.0 已有 56 項單元／元件測試通過，CI 的 Firestore／Storage 規則測試與 Pages 部署也通過。

`npm run lint` 目前有部分舊有全專案問題，例如 Cloud Functions CommonJS globals、舊元件未使用變數與 Hook 規則；不要誤認為都是新功能造成。修改過的檔案仍應做目標式 ESLint 檢查，並且不得新增 error。

### 9. Firebase 與部署安全

- `smes-e1dc3` 是共用專案，同時服務報修、3D 畫廊、行政系統等；`companion` 使用獨立資料庫邊界。
- 不可執行無範圍的整包 Firebase deploy。
- OCR／地圖上傳後端屬於 `repair-map` codebase；依專案 README 的限定命令：

```powershell
firebase deploy --only functions:repair-map --project=smes-e1dc3 --account=cagooo@gmail.com
```

- 只有在 `functions-map` 確實變更且測試通過時才部署此 codebase。
- Firestore／Storage 規則有變更時，必須先跑 Emulator 回歸測試，並確認 3D 畫廊、行政系統、匿名報修圖片上傳與未授權拒絕仍正常。
- 主要管理員 UI 驗收帳號是 `cagooo@gmail.com`；動態管理員需從 Firestore 授權名單取得另一個正式測試帳號。
- GitHub 使用者為 `cagoooo`。推送 `main` 會觸發 `.github/workflows/deploy.yml`，依序執行 npm tests、Firebase rules tests、build 與 GitHub Pages 部署。

### 10. Git、版本與完成標準

- 保留使用者既有變更；提交只包含本次工作。
- 不可使用破壞性 Git 指令清除工作樹。
- 版本的單一真實來源是 `package.json`。升版後執行 `npm run build` 或 `npm run sync:pwa`，並以 `npm run check:pwa` 確認 `package.json`、`public/version.json`、`public/sw.js` 一致。
- `Footer.jsx` 已直接讀 `package.json`，不可再寫死版本號。
- 功能完成後更新 `H:\repair\PROGRESS.md`；若涉及已選 A＋B 驗收，也同步更新 RDQ 文件與 115 驗收手冊。
- commit＋push 後必須等待 GitHub Actions 完成。不要只看 Actions 綠勾，還要讀線上 `version.json` 並確認實際新資源已部署。
- 對桌機、平板與手機可見性／不重疊進行相稱的 UI 驗證。

### 11. 接手後的第一則回覆

完成只讀盤點後，請用繁體中文簡短回報：

1. 已同步到哪個 `origin/main` commit。
2. 工作樹是否乾淨。
3. 目前版本是否為 v0.13.0，線上部署是否正常。
4. 已完成項目不會重做。
5. 目前等待的是 115 學年度實圖，以及 P0-7／P0-8 正式驗收條件。

若圖片尚未提供，到此即可回報「已準備好接手」，不要自行變更正式資料。若圖片已提供，立即按第 6 節進行不發布演練。
