import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
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

        // ✅ 新版離線快取寫法（取代已棄用的 enableIndexedDbPersistence）
        db = initializeFirestore(app, {
            cache: persistentLocalCache({
                tabManager: persistentMultipleTabManager() // 支援多分頁同時開啟
            })
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
