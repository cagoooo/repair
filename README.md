# 校園報修系統 (Campus Repair System)

一個基於 React + Vite + Firebase 的校園設備報修系統。

## 🌟 功能特色

- **AI 自動辨識地圖**：整合 Google Vision API，一鍵辨識教室編號與名稱。
- **智慧名稱聚合**：獨家遞迴連鎖演算法，能精準抓取分散的班級文字。
- **專業級標籤排版**：編號與名稱垂直堆疊，支援小空間溢出顯示，極具美感。
- **互動式地圖報修**：直觀點擊教室即可報修。
- **RWD 響應式設計**：支援手機、平板與桌機，介面繽紛且操作流暢。
- **即時狀態更新**：整合 Firebase Firestore，報修狀態即時同步。
- **權限管理**：
  - **一般使用者**：僅可報修。
  - **管理員**：可管理報修單、編輯地圖、設定通知、執行 AI 掃描。
- **Line Notify 通知**：報修單建立與更新時自動發送卡片式通知。
- **雲端設定同步**：系統設定儲存於雲端，維護更便利。

## 🚀 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

請複製 `.env.example` 為 `.env` 並填入您的 Firebase 與 Google Cloud 設定：

```ini
# Firebase Config
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Google Cloud Vision API Key (For AI Detection)
VITE_GOOGLE_VISION_API_KEY=your_vision_api_key
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
- **AI 服務**: Google Cloud Vision API
- **樣式**: CSS (Variables, Gradients, Glassmorphism)
- **後端服務**: Firebase (Auth, Firestore, Storage, Hosting)
- **部署**: GitHub Pages / Firebase Hosting

## 📝 版本紀錄

- **v0.5.0** (2026/02/18):
  - 👥 **動態管理員 (Dynamic Admin)**：支援從 Firestore 動態載入管理員名單，不再需要修改程式碼即可新增管理員。
  - 📢 **通知分流 (Notification Separation)**：區分「資訊組」與「事務組」的 LINE 通知 Token，確保訊息準確傳達給負責單位。
  - 🗑️ **批次刪除 (Batch Delete)**：管理後台新增批次選取與刪除功能，大幅提升舊資料整理效率。
  - ⚙️ **UX 優化**：新增 LINE Token 同步功能與詳細設定指引。


- **v0.4.0** (2026/02/12):
  - 📡 **全方位離線支援**：實作 Firestore 離線持久化與 IndexedDB 圖片暫存機制，解決網路死角報修痛點。
  - 🔄 **智能自動同步**：偵測連線恢復後自動執行背景同步，包含圖片壓縮與 Line 通知補發。
  - 🆘 **地圖區域動態**：為「緊急」報修區域新增動態擴散波紋與紅光閃爍效果，大幅強化警示視覺。
  - 💾 **離線 UI 引導**：提交時若斷網，成功畫面會自動切換為本地存儲標記，提供準確的操作回饋。

- **v0.3.1** (2026/02/12):
  - 🎨 **頁尾視覺重盤**：導入 Aurora UI 流動漸層與 Glassmorphism 磨砂玻璃效果，大幅提升質感。
  - 🧩 **整合圖例設計**：將地圖狀態圖例整合至頁尾，並支援智慧 RWD 佈局，解決手機版擁擠問題。
  - 💓 **動態體驗**：為狀態指示燈與版權圖標加入細微動效，提升介面生命力。

- **v0.3.0** (2026/02/12):
  - 🚀 **UX 完整反饋**：新增提交成功慶祝畫面與報修摘要，提供更明確的操作回饋。
  - 📷 **列印功能強化**：報修單現在支援夾帶 1-3 張現場照片，並優化了列印格線排版。
  - 📱 **RWD 全面修復**：修正成功畫面在小螢幕下的裁切問題，支援捲動並優化手機端視覺。
  - ⚙️ **提交流程優化**：解耦表單關閉與提交邏輯，確保使用者能完整閱覽報修結果。

- **v0.2.0** (2026/02/12):
  - 🤖 **AI 大升級**：整合 Google Cloud Vision，支援自動標記教室區域。
  - 🧲 **名稱聚合優化**：新增「連鎖磁吸」演算法，找回破碎的班級文字（如一年 1 班）。
  - 🎨 **UI 全面美化**：地圖標籤改為堆疊式設計，大幅提升高解析與小螢幕下的閱讀性。
  - 🧹 **去重邏輯**：自動處理編號與名稱重複顯示的問題。
  - 🛡️ **穩定性提升**：修復 Firestore 儲存失敗問題，並加入 API Key 安全盤查規則。

- **v0.1.0** (2026/02/11):
  - ✨ 全新 UI 優化：繽紛漸層風格，增強互動回饋。
  - 📱 RWD 改善：優化手機版填單體驗。
  - 🔄 設定遷移：Line Notify 設定改為雲端儲存 (Firestore)。
  - 🐛 修正 C118/C116 教室名稱重複導致的狀態錯誤。

---
Made with ❤️ for SMES
