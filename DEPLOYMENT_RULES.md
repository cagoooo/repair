# ⚠️ 部署規範 — 校園報修系統 × AI 客服系統共用 Firebase 專案

> **Firebase 專案 ID：`smes-e1dc3`**  
> 此專案同時供 **校園報修系統**（`h:\repair`）與 **AI 客服系統**（`h:\service`）使用。  
> 部署前必須閱讀並遵守以下規範，**否則可能導致另一套系統失效**。

---

## 🗂️ 資源分工

| 資源 | 校園報修系統（`h:\repair`） | AI 客服系統（`h:\service`） |
|------|-----------------------------|------------------------------|
| **Firestore Collections** | `repairs/`、`system/*` | `chats/`、`config/`、`usage/`、`knowledge/` |
| **Cloud Functions** | `sendLineNotification`（us-central1） | `askGemini`、`notifyLineOnNewChat` 等 13 個（asia-northeast1） |
| **Hosting** | `cagoooo.github.io/repair/` | `cagoooo.github.io/smes/` |
| **Firebase Auth** | 共用同一使用者池 | 共用同一使用者池 |

---

## 🚨 部署操作規範

### 1. 部署 Firestore Rules（最高風險）

```bash
firebase deploy --only firestore:rules --project smes-e1dc3
```

> [!CAUTION]
> **無論從哪個目錄部署，都會覆蓋線上的 Firestore 規則！**

**部署前檢查清單：**
- [ ] 確認 `h:\repair\firestore.rules` 與 `h:\service\firestore.rules` 內容完全相同
- [ ] 兩份規則必須同時包含修繕系統與 AI 客服系統的 collections
- [ ] 如有修改，必須同步更新另一份再部署

**合併版規則包含的 collections：**
```
system/adminConfig    → 修繕系統（公開讀）
system/mapConfig      → 修繕系統（公開讀）
system/notificationConfig → 修繕系統（公開讀）
repairs/{id}          → 修繕系統
repairs/{id}/comments → 修繕系統
chats/{uid}           → AI 客服系統
knowledge/{doc}       → AI 客服系統
config/{doc}          → AI 客服系統
usage/{uid}           → AI 客服系統
```

---

### 2. 部署 Cloud Functions

```bash
firebase deploy --only functions --project smes-e1dc3
```

> [!IMPORTANT]
> `h:\service\functions\index.js` 末尾已包含 `sendLineNotification`（修繕系統專用）。  
> **請勿從該檔案中刪除此 Function**，否則修繕系統 LINE 通知將完全失效。

| 從哪個目錄部署 | 是否安全 | 說明 |
|---------------|---------|------|
| `h:\repair` | ✅ 安全 | 僅部署 `sendLineNotification` |
| `h:\service` | ✅ 安全 | 包含所有 Functions（兩套並存） |

**若需新增 Function 到修繕系統，必須同步更新：**
1. `h:\repair\functions\index.js`
2. `h:\service\functions\index.js`

---

### 3. 部署 Hosting

兩套系統各自部署到不同的 GitHub Pages，**互不影響**，可放心操作。

---

## 🛠️ 快速同步 Firestore Rules 指令

```powershell
# 先將 repair 的規則複製至 service（或反向），再部署
Copy-Item "H:\repair\firestore.rules" -Destination "H:\service\firestore.rules"

# 從任一目錄部署
firebase deploy --only firestore:rules --project smes-e1dc3
```

---

## 📞 問題聯絡

如有疑問，請參閱 [Firebase Console](https://console.firebase.google.com/project/smes-e1dc3/overview)。
