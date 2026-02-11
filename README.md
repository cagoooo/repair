# 校園報修系統 (Campus Repair System)

一個基於 React + Vite + Firebase 的校園設備報修系統。

## 🌟 功能特色

- **互動式地圖報修**：直觀點擊教室即可報修。
- **RWD 響應式設計**：支援手機、平板與桌機，介面繽紛且操作流暢。
- **即時狀態更新**：整合 Firebase Firestore，報修狀態即時同步。
- **權限管理**：
  - **一般使用者**：僅可報修。
  - **管理員**：可管理報修單、編輯地圖、設定通知。
- **Line Notify 通知**：報修單建立與更新時自動發送 Line 通知 (需設定 Token)。
- **雲端設定同步**：系統設定 (Line Token 等) 儲存於雲端，跟隨管理員帳號。

## 🚀 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

請複製 `.env.example` 為 `.env` 並填入您的 Firebase 設定：

```ini
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. 以開發模式執行

```bash
npm run dev
```

### 4. 建置正式版

```bash
npm run build
```

## 🛠️ 技術堆疊

- **前端框架**: React 19
- **建置工具**: Vite
- **樣式**: CSS (Variables, Gradients, Glassmorphism)
- **後端服務**: Firebase (Auth, Firestore, Storage, Hosting)
- **部署**: GitHub Pages / Firebase Hosting

## 📝 版本紀錄

- **v0.1.0** (2026/02/11):
  - ✨ 全新 UI 優化：繽紛漸層風格，增強互動回饋。
  - 📱 RWD 改善：優化手機版填單體驗。
  - 🔄 設定遷移：Line Notify 設定改為雲端儲存 (Firestore)。
  - 🐛 修正 C118/C116 教室名稱重複導致的狀態錯誤。

---
Made with ❤️ for SMES
