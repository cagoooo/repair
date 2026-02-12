import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
let app = null;
let db = null;
let auth = null;
let storage = null;

if (firebaseConfig.apiKey) {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);

        // 啟用離線持久化
        enableIndexedDbPersistence(db).catch((err) => {
            if (err.code === 'failed-precondition') {
                // 多個分頁打開時，只有一個能啟用持久化
                console.warn('Firestore persistence failed: Multiple tabs open');
            } else if (err.code === 'unimplemented') {
                // 瀏覽器不支援
                console.warn('Firestore persistence not supported by browser');
            }
        });

        auth = getAuth(app);
        storage = getStorage(app);
    } catch (e) {
        console.error('Firebase initialization failed:', e);
    }
} else {
    console.warn('⚠️ Firebase API Key not found. Running in local mode only.');
}

export { db, auth, storage };
export default app;
