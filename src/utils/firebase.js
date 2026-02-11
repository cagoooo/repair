// Firebase 設定
// 請將以下值替換為您的 Firebase 專案設定
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// 檢查是否有設定 Firebase
export const isFirebaseConfigured = () => {
    return firebaseConfig.apiKey && firebaseConfig.projectId;
};

// 初始化 Firebase（僅在有設定時）
let app = null;
let db = null;
let storage = null;
let auth = null;

if (isFirebaseConfigured()) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
}

export { app, db, storage, auth };
