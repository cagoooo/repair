import { useState, useEffect, useMemo } from 'react';
import InteractiveMap from './components/InteractiveMap';
import MapEditor from './components/MapEditor';
import MapUploader from './components/MapUploader';
import RepairForm from './components/RepairForm';
import RepairList from './components/RepairList';
import AdminDashboard from './components/AdminDashboard';
import Skeleton from './components/Skeleton';
import ScrollToTop from './components/ScrollToTop'; // [NEW] Import ScrollToTop
import { useToast } from './components/Toast';
import { checkIsAdmin, DEFAULT_GAS_PROXY, SUBMIT_COOLDOWN_MS, SUPER_ADMIN } from './config/constants'; // [NEW] Import constants
import { REPAIR_CATEGORIES } from './data/repairCategories';
import Footer from './components/Footer';
import './App.css';

// 本地儲存 key
const STORAGE_KEYS = {
  MAP_IMAGE: 'repair_map_image',
  ROOMS: 'repair_rooms',
  REPAIRS: 'repair_repairs'
};

import { db, auth } from './firebase';
import {
  doc, getDoc, setDoc, onSnapshot,
  collection, addDoc, updateDoc, deleteDoc, query, orderBy, writeBatch
} from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { sendLineNotification } from './services/notificationService';
import { getPendingUploads, removePendingUpload } from './utils/offlineDB';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import imageCompression from 'browser-image-compression';

function App() {
  // Toast 通知
  const toast = useToast();

  // 狀態
  const [activeTab, setActiveTab] = useState('map');
  const [mapImage, setMapImage] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [rawRepairs, setRawRepairs] = useState([]); // [MODIFY] Rename to rawRepairs
  const [myRepairIds, setMyRepairIds] = useState(() => { // [NEW] Lift local storage state
    try {
      return JSON.parse(localStorage.getItem('my_repair_ids') || '[]');
    } catch (e) {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [showRepairForm, setShowRepairForm] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showSetup, setShowSetup] = useState(false);

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // 通知設定狀態
  const [itLineToken, setItLineToken] = useState('');
  const [itTargetId, setItTargetId] = useState('');
  const [generalLineToken, setGeneralLineToken] = useState('');
  const [generalTargetId, setGeneralTargetId] = useState('');
  const [gasProxy, setGasProxy] = useState(DEFAULT_GAS_PROXY);

  // 動態管理員狀態
  const [additionalAdmins, setAdditionalAdmins] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [notifyTab, setNotifyTab] = useState('it');

  // Deep Linking 狀態
  const [highlightRepairId, setHighlightRepairId] = useState(null);

  // 處理 Deep Linking (URL Query Param)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const repairId = params.get('repairId');
    if (repairId) {
      setHighlightRepairId(repairId);
      setActiveTab('list');
      // 移除 URL 參數，避免重整後持續觸發 (可選)
      // window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // 監聽動態管理員名單
  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(doc(db, 'system', 'adminConfig'), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setAdditionalAdmins(data.emails || []);
      }
    });
    return () => unsubscribe();
  }, [db]);

  // 載入通知設定
  // 載入通知設定 (從 Firestore)
  useEffect(() => {
    const fetchSettings = async () => {
      // 優先從 Firestore 讀取
      if (db) {
        try {
          const docRef = doc(db, 'system', 'notificationConfig');
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            // 資訊組 (相容舊欄位)
            setItLineToken(data.itLineToken || data.lineToken || '');
            setItTargetId(data.itTargetId || data.targetId || '');

            // 事務組
            setGeneralLineToken(data.generalLineToken || '');
            setGeneralTargetId(data.generalTargetId || '');

            if (data.gasProxy) setGasProxy(data.gasProxy);
            return; // 雲端有資料就不讀本地
          }
        } catch (error) {
          console.error('Error fetching settings:', error);
        }
      }

      // Fallback: 如果雲端沒資料，嘗試讀取本地 (第一次遷移)
      const savedToken = localStorage.getItem('line_notify_token');
      const savedTargetId = localStorage.getItem('line_target_id');
      const savedProxy = localStorage.getItem('gas_proxy_url');

      if (savedToken) setItLineToken(savedToken);
      if (savedTargetId) setItTargetId(savedTargetId);
      if (savedProxy) setGasProxy(savedProxy);
    };

    fetchSettings();
  }, [db]);

  // ---------------------------------------------------------
  // 離線資料同步邏輯
  // ---------------------------------------------------------
  const syncOfflineData = async () => {
    if (!navigator.onLine || !db) return;

    try {
      const pending = await getPendingUploads();
      if (pending.length === 0) return;

      console.log(`Found ${pending.length} pending offline reports. Syncing...`);
      toast.info(`正在同步 ${pending.length} 筆離線報修資料...`);

      for (const item of pending) {
        const { room, formData, images } = item;
        const imageUrls = [];

        // 1. 上傳圖片 (如果有)
        if (images && images.length > 0) {
          for (const img of images) {
            try {
              const compressed = await imageCompression(img, {
                maxSizeMB: 0.2,
                maxWidthOrHeight: 800,
                useWebWorker: true,
                fileType: 'image/webp'
              });
              const storageRef = ref(storage, `repair-images/${Date.now()}_${img.name.replace(/\.\w+$/, '.webp')}`);
              const snapshot = await uploadBytes(storageRef, compressed);
              const url = await getDownloadURL(snapshot.ref);
              imageUrls.push(url);
            } catch (imgError) {
              console.error('Offline image upload failed:', imgError);
            }
          }
        }

        // 2. 建立 Firestore 文件
        const repairData = {
          roomId: room.id,
          roomCode: room.code,
          roomName: room.name,
          category: formData.category,
          itemType: formData.itemType,
          itemName: REPAIR_CATEGORIES[formData.category]?.items.find(i => i.id === formData.itemType)?.name || '',
          description: formData.description,
          priority: formData.priority,
          reporterName: formData.reporterName,
          reporterContact: formData.reporterContact,
          imageUrl: imageUrls[0] || null,
          imageUrls: imageUrls,
          status: 'pending',
          createdAt: item.timestamp || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isSync: true // 標記為同步資料
        };

        const repairsRef = collection(db, 'repairs');
        await addDoc(repairsRef, repairData);

        // 3. 發送 Line 通知
        const isGeneral = formData.category === 'GENERAL';
        const token = isGeneral ? generalLineToken : itLineToken;
        const targetId = isGeneral ? generalTargetId : itTargetId;

        if (token) {
          try {
            await sendLineNotification(repairData, {
              token,
              proxyUrl: gasProxy,
              targetId,
              repairData
            });
          } catch (notifErr) {
            console.warn('Sync notification failed:', notifErr);
          }
        }

        // 4. 移除本地暫存
        await removePendingUpload(item.id);
      }

      toast.success('離線資料同步成功！');
    } catch (error) {
      console.error('Offline sync failed:', error);
      toast.error('離線資料同步失敗，將於下此連線時重試。');
    }
  };

  // 監聽連線事件
  useEffect(() => {
    const handleOnline = () => {
      console.log('App is online. Triggering sync...');
      syncOfflineData();
    };

    window.addEventListener('online', handleOnline);
    // 元件掛載時也檢查一次
    if (navigator.onLine) {
      syncOfflineData();
    }
    return () => window.removeEventListener('online', handleOnline);
  }, [db, itLineToken, itTargetId, generalLineToken, generalTargetId, gasProxy]);

  // 儲存通知設定
  // 儲存通知設定 (到 Firestore + 本地備份)
  const handleSaveNotifySettings = async () => {
    // 儲存到本地 (作為備份)
    localStorage.setItem('line_notify_token', itLineToken);
    localStorage.setItem('line_target_id', itTargetId);
    localStorage.setItem('gas_proxy_url', gasProxy);

    // 儲存到雲端 (主要儲存)
    if (db && isAdmin) {
      try {
        await setDoc(doc(db, 'system', 'notificationConfig'), {
          itLineToken: itLineToken,
          itTargetId: itTargetId,
          generalLineToken: generalLineToken,
          generalTargetId: generalTargetId,
          gasProxy: gasProxy,
          updatedAt: new Date().toISOString()
        });
        toast.success('通知設定已儲存到雲端！');
      } catch (error) {
        console.error('儲存到雲端失敗:', error);
        toast.warning('已儲存到本地，但雲端同步失敗：' + error.message);
      }
    } else {
      toast.warning('已儲存到本地 (未登入管理員或資料庫未連線，無法同步到雲端)');
    }
  };

  // 新增管理員
  const handleAddAdmin = async () => {
    if (!newAdminEmail || !newAdminEmail.includes('@')) {
      toast.error('請輸入有效的 Email');
      return;
    }
    if (additionalAdmins.includes(newAdminEmail)) {
      toast.warning('此 Email 已在管理員名單中');
      return;
    }

    try {
      const newAdmins = [...additionalAdmins, newAdminEmail];
      await setDoc(doc(db, 'system', 'adminConfig'), {
        emails: newAdmins,
        updatedAt: new Date().toISOString()
      });
      setNewAdminEmail('');
      toast.success(`已將 ${newAdminEmail} 加入管理員`);
    } catch (e) {
      console.error('新增管理員失敗:', e);
      toast.error('新增失敗：' + e.message);
    }
  };

  // 移除管理員
  const handleRemoveAdmin = async (emailToRemove) => {
    if (!confirm(`確定要移除 ${emailToRemove} 的管理員權限嗎？`)) return;

    try {
      const newAdmins = additionalAdmins.filter(email => email !== emailToRemove);
      await setDoc(doc(db, 'system', 'adminConfig'), {
        emails: newAdmins,
        updatedAt: new Date().toISOString()
      });
      toast.success(`已移除 ${emailToRemove}`);
    } catch (e) {
      console.error('移除管理員失敗:', e);
      toast.error('移除失敗：' + e.message);
    }
  };

  // 監聽登入狀態
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      // 權限控管
      if (currentUser) {
        const isSuperAdmin = currentUser.email === SUPER_ADMIN;
        const isDynamicAdmin = additionalAdmins.includes(currentUser.email);

        // 如果是 Super Admin 或在動態名單中，或是舊有的硬編碼名單 (過渡期)
        if (isSuperAdmin || isDynamicAdmin || checkIsAdmin(currentUser.email)) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, [additionalAdmins]); // 當名單更新時重新檢查權限

  // 處理登入
  const handleLogin = async () => {
    if (!auth) {
      toast.error('Firebase Auth 未初始化，請檢查 .env 設定');
      return;
    }
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('登入失敗:', error);
      toast.error('登入失敗: ' + error.message);
    }
  };

  // 處理登出
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveTab('map'); // 登出後回到地圖頁
    } catch (error) {
      console.error('登出失敗:', error);
    }
  };

  // 載入本地儲存的資料
  // 載入資料 (優先從 Firebase，失敗則從 LocalStorage)
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. 嘗試從 Firebase 讀取地圖設定 (如果有連線)
        let docSnap = null;
        if (db) {
          try {
            const docRef = doc(db, 'system', 'mapConfig');
            docSnap = await getDoc(docRef);
          } catch (e) {
            console.warn('Firebase connection failed, falling back to local:', e);
          }
        }

        if (docSnap && docSnap.exists()) {
          const data = docSnap.data();
          // 優先讀取 Storage URL，向後兼容 base64
          if (data.mapImageUrl) setMapImage(data.mapImageUrl);
          else if (data.mapImage) setMapImage(data.mapImage);
          if (data.rooms) setRooms(data.rooms);
          console.log('已從雲端載入地圖設定');
        } else {
          // 2. 如果雲端沒資料或沒連線，嘗試本地儲存
          const savedImage = localStorage.getItem(STORAGE_KEYS.MAP_IMAGE);
          const savedRooms = localStorage.getItem(STORAGE_KEYS.ROOMS);

          if (savedImage) setMapImage(savedImage);
          if (savedRooms) setRooms(JSON.parse(savedRooms));

          if (!savedImage && (!docSnap || !docSnap.exists())) {
            setShowSetup(true);
          }
        }

        // 3. 載入報修記錄 (已改為即時監聽 Firestore，見下方 useEffect)

      } catch (error) {
        console.error('載入資料失敗:', error);
        // 錯誤時的備用方案：讀取本地
        const savedImage = localStorage.getItem(STORAGE_KEYS.MAP_IMAGE);
        const savedRooms = localStorage.getItem(STORAGE_KEYS.ROOMS);
        if (savedImage) setMapImage(savedImage);
        if (savedRooms) setRooms(JSON.parse(savedRooms));
      }
    };

    loadData();
  }, []);

  // 儲存資料到本地
  useEffect(() => {
    if (mapImage) {
      localStorage.setItem(STORAGE_KEYS.MAP_IMAGE, mapImage);
    }
  }, [mapImage]);

  // [NEW] Sync myRepairIds to localStorage
  useEffect(() => {
    localStorage.setItem('my_repair_ids', JSON.stringify(myRepairIds));
  }, [myRepairIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
  }, [rooms]);

  // 監聽 Firestore 報修資料變更 (Real-time)
  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    const repairsRef = collection(db, 'repairs');
    const q = query(repairsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const repairsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 自動遷移：如果雲端沒資料但本地有，執行一次性上傳
      if (snapshot.empty) {
        const localRepairs = localStorage.getItem(STORAGE_KEYS.REPAIRS);
        if (localRepairs) {
          try {
            const parsed = JSON.parse(localRepairs);
            if (parsed.length > 0) {
              console.log('🔄 偵測到本地資料，正在遷移至雲端...');
              const batch = writeBatch(db);
              parsed.forEach(repair => {
                const newDocRef = doc(collection(db, 'repairs'));
                batch.set(newDocRef, {
                  ...repair,
                  migratedFromLocal: true,
                  createdAt: repair.createdAt || new Date().toISOString()
                });
              });
              await batch.commit();
              console.log('✅ 本地資料遷移完成！');
            }
          } catch (e) {
            console.error('資料遷移失敗:', e);
          }
        }
      }

      setRawRepairs(repairsData); // [MODIFY] Update rawRepairs
      setIsLoading(false);
    }, (error) => {
      console.error("讀取報修資料錯誤:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  // [NEW] Derive repairs with isMine flag
  const repairs = useMemo(() => {
    return rawRepairs.map(repair => ({
      ...repair,
      isMine: myRepairIds.includes(repair.id)
    }));
  }, [rawRepairs, myRepairIds]);

  // 🔔 動態頁面標題：顯示待處理報修數
  useEffect(() => {
    const pendingCount = repairs.filter(r => r.status === 'pending').length;
    document.title = pendingCount > 0
      ? `(${pendingCount}) 校園報修系統`
      : '校園報修系統 - 智慧化報修管理';
  }, [repairs]);


  // 處理地圖上傳
  const handleMapUpload = (imageData, fileName) => {
    // 如果是初始設定 (showSetup === true)，允許上傳
    // 否則必須是管理員
    if (!showSetup && !isAdmin) {
      toast.warning('權限不足：僅管理員可更換地圖');
      return;
    }
    setMapImage(imageData);
    setShowSetup(false);
    // 上傳新地圖後開啟編輯器
    setTimeout(() => setShowEditor(true), 300);
  };

  // 處理教室更新
  const handleRoomsChange = (newRooms) => {
    setRooms(newRooms);
  };

  // 儲存地圖設定到雲端
  const handleSaveMapConfig = async (newRooms) => {
    if (!isAdmin) {
      toast.warning('權限不足：僅管理員可儲存設定');
      return;
    }
    if (!db) {
      toast.warning('未設定 Firebase 連線，僅儲存於本地瀏覽器。若要啟用雲端同步，請聯絡管理員設定環境變數。');
      return;
    }
    try {
      const configData = {
        rooms: newRooms,
        updatedAt: new Date().toISOString()
      };
      // 如果 mapImage 是 URL（非 base64），存為 mapImageUrl
      if (mapImage && !mapImage.startsWith('data:')) {
        configData.mapImageUrl = mapImage;
      } else if (mapImage) {
        configData.mapImage = mapImage;
      }
      await setDoc(doc(db, 'system', 'mapConfig'), configData);
      toast.success('地圖設定已儲存到雲端！所有使用者重整後皆可看到新配置。');
    } catch (error) {
      console.error('儲存失敗:', error);
      toast.error('儲存失敗：' + error.message);
    }
  };

  // 處理教室點擊（報修）
  const handleRoomClick = (room) => {
    setSelectedRoom(room);
    setShowRepairForm(true);
  };

  // 🛡️ 報修提交節流（30 秒冷卻）
  const lastSubmitRef = { current: 0 };

  // 提交報修
  // 提交報修 (Firestore)
  const handleSubmitRepair = async (repairData) => {
    if (!db) { toast.error('無資料庫連線'); return null; }

    // 前端 Rate Limiting
    const now = Date.now();
    if (now - lastSubmitRef.current < SUBMIT_COOLDOWN_MS) {
      toast.warning(`提交過於頻繁，請稍候 ${SUBMIT_COOLDOWN_MS / 1000} 秒再試`);
      return null;
    }
    lastSubmitRef.current = now;

    try {
      const docRef = await addDoc(collection(db, 'repairs'), {
        ...repairData,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      // 不需在此關閉表單，交給 RepairForm 內部的成功畫面處理

      // 發送 Line 通知
      try {
        const isGeneral = repairData.category === 'GENERAL';
        const token = isGeneral ? generalLineToken : itLineToken;
        const targetId = isGeneral ? generalTargetId : itTargetId;

        if (token) {
          const message = `\n[新報修通知]\n地點: ${repairData.roomCode} ${repairData.roomName}\n類別: ${repairData.category}\n項目: ${repairData.itemType}\n描述: ${repairData.description}\n申報人: ${repairData.reporterName}`;
          await sendLineNotification(message, {
            token: token,
            proxyUrl: gasProxy,
            targetId: targetId,
            repairData: repairData
          });
        }
      } catch (notifyError) {
        console.error('Notification failed:', notifyError);
      }

      // [NEW] Update local myRepairIds state immediately
      if (docRef.id) {
        setMyRepairIds(prev => {
          if (prev.includes(docRef.id)) return prev;
          return [...prev, docRef.id];
        });
      }
      return docRef.id;
    } catch (e) {
      console.error('報修提交失敗:', e);
      toast.error('報修提交失敗');
      return null;
    }
  };

  // 更新報修狀態 (Firestore) - 含時間軸記錄
  const handleUpdateStatus = async (repairId, newStatus) => {
    if (!db) return;
    try {
      const repairRef = doc(db, 'repairs', repairId);
      const now = new Date().toISOString();
      const updateData = {
        status: newStatus,
        updatedAt: now
      };
      // 記錄時間軸節點
      if (newStatus === 'in_progress') updateData.startedAt = now;
      if (newStatus === 'completed') updateData.completedAt = now;
      await updateDoc(repairRef, updateData);
    } catch (e) {
      console.error('更新狀態失敗:', e);
    }
  };

  // 新增處理備註 (Firestore subcollection)
  const handleAddComment = async (repairId, text) => {
    if (!isAdmin || !db) return;
    try {
      await addDoc(collection(db, 'repairs', repairId, 'comments'), {
        text,
        author: user?.displayName || user?.email || '管理員',
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error('新增備註失敗:', e);
      throw e;
    }
  };

  // 刪除報修 (Firestore)
  const handleDeleteRepair = async (repairId, skipConfirm = false) => {
    // 檢查是否為自己的報修
    const myRepairIds = JSON.parse(localStorage.getItem('my_repair_ids') || '[]');
    const isMine = myRepairIds.includes(repairId);

    // 權限檢查：只有管理員和擁有者可以刪除
    if (!isAdmin && !isMine) {
      if (!skipConfirm) toast.warning('權限不足：僅管理員或本人可刪除報修單');
      return;
    }

    const targetRepair = repairs.find(r => r.id === repairId);
    // 如果是本人且非 pending 狀態 (已處理中/已完成)，禁止刪除 (除非是 Admin)
    if (!isAdmin && isMine && targetRepair?.status !== 'pending') {
      if (!skipConfirm) toast.warning('僅能撤銷「待處理」的報修單，若已開始處理請聯絡管理員。');
      return;
    }

    // 確認視窗 (若 skipConfirm 為 true 則跳過)
    if (!skipConfirm) {
      if (!globalThis.confirm('確定要刪除/撤銷此報修單嗎？')) return;
    }

    if (!db) return;

    try {
      if (isAdmin) {
        // 管理員：硬刪除 Firestore 文件
        await deleteDoc(doc(db, 'repairs', repairId));
        if (!skipConfirm) toast.success('報修單已刪除');
      } else {
        // 使用者：軟刪除 (標記為 cancelled)
        await updateDoc(doc(db, 'repairs', repairId), {
          status: 'cancelled',
          updatedAt: new Date().toISOString()
        });
        if (!skipConfirm) toast.success('已撤銷您的報修申請');
      }

      // 如果是自己的，操作後從 localStorage 移除 ID
      if (isMine) {
        setMyRepairIds(prev => prev.filter(id => id !== repairId));
      }
    } catch (e) {
      console.error('刪除失敗:', e);
      if (!skipConfirm) toast.error('操作失敗');
    }
  };

  // 清除所有資料
  const handleClearData = () => {
    if (!isAdmin) {
      toast.warning('權限不足：僅管理員可清除資料');
      return;
    }
    if (confirm('確定要清除所有資料嗎？此操作無法復原。')) {
      localStorage.removeItem(STORAGE_KEYS.MAP_IMAGE);
      localStorage.removeItem(STORAGE_KEYS.ROOMS);
      localStorage.removeItem(STORAGE_KEYS.REPAIRS);
      setMapImage(null);
      setRooms([]);
      setRepairs([]);
      setShowSetup(true);
    }
  };

  return (
    <div className="app">
      {/* 標題列 */}
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="title-icon">🏫</span>
            校園報修系統
          </h1>
          <nav className="app-nav">
            <button
              className={`nav-btn ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
            >
              🗺️ 地圖
            </button>
            <button
              className={`nav-btn ${activeTab === 'list' ? 'active' : ''}`}
              onClick={() => setActiveTab('list')}
            >
              📋 列表
              {repairs.filter(r => r.status === 'pending').length > 0 && !isAdmin && (
                <span className="nav-badge">
                  {repairs.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
            {isAdmin && (
              <button
                className={`nav-btn ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin')}
              >
                📊 管理後台
              </button>
            )}
            <button
              className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              ⚙️ 設定
            </button>
          </nav>
        </div>
      </header>

      {/* 主內容 */}
      <main className="app-main">
        {/* 設定畫面（首次使用或無地圖時） */}
        {showSetup && (
          <div className="setup-container">
            <div className="setup-card glass-card">
              <h2>🎉 歡迎使用校園報修系統</h2>
              <p className="setup-description">
                請先上傳您學校的教室配置圖，系統將引導您設定各教室的位置。
              </p>
              <MapUploader onUpload={handleMapUpload} currentImage={null} />
            </div>
          </div>
        )}

        {/* 教室地圖頁面 */}
        {!showSetup && activeTab === 'map' && (
          <div className="map-page">
            <InteractiveMap
              imageUrl={mapImage}
              rooms={rooms}
              repairs={repairs}
              onRoomClick={handleRoomClick}
              onEditMap={isAdmin ? () => setShowEditor(true) : undefined}
            />

            {rooms.length === 0 && mapImage && isAdmin && (
              <div className="hint-banner">
                <span>💡</span>
                <p>提示：點擊「編輯地圖」按鈕來標記教室位置</p>
              </div>
            )}
          </div>
        )}

        {/* 報修列表頁面 */}
        {!showSetup && activeTab === 'list' && (
          <div className="list-page">
            {isLoading ? (
              <div className="animate-fadeIn" style={{ padding: '2rem 0' }}>
                <Skeleton type="stat" count={4} />
                <Skeleton type="card" count={4} />
              </div>
            ) : (
              <RepairList
                repairs={repairs}
                isAdmin={isAdmin}
                onUpdateStatus={handleUpdateStatus}
                onAddComment={handleAddComment}
                onDeleteRepair={handleDeleteRepair}
                highlightRepairId={highlightRepairId}
                onViewRoom={(roomId) => {
                  const room = rooms.find(r => r.id === roomId);
                  if (room) setSelectedRoom(room);
                  setActiveTab('map');
                }}
              />
            )}
          </div>
        )}

        {/* 管理員後台頁面 */}
        {!showSetup && activeTab === 'admin' && isAdmin && (
          <div className="admin-page">
            <AdminDashboard
              repairs={repairs}
              rooms={rooms}
              onUpdateStatus={handleUpdateStatus}
              onDeleteRepair={handleDeleteRepair}
            />
          </div>
        )}

        {/* 設定頁面 */}
        {!showSetup && activeTab === 'settings' && (
          <div className="settings-page animate-fadeIn">
            <header className="settings-header">
              <h2>⚙️ 系統設定</h2>
              <p className="text-muted">管理您的帳號身分與系統參數</p>
            </header>

            <div className="settings-grid">
              {/* 使用者身分 */}
              <div className="settings-card user-card">
                <div className="card-header">
                  <h3>👤 使用者身分</h3>
                  <span className={`badge ${isAdmin ? 'badge-urgent' : 'badge-in-progress'}`}>
                    {isAdmin ? 'Admin' : 'User'}
                  </span>
                </div>
                <div className="user-info-content">
                  <div className="user-avatar">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="User Avatar" />
                    ) : (
                      <span>{user?.email?.[0]?.toUpperCase() || 'G'}</span>
                    )}
                  </div>
                  <div className="user-details">
                    <h4>{user?.displayName || '訪客'}</h4>
                    <p className="user-email">{user?.email || '尚未登入'}</p>
                  </div>
                </div>
                <div className="card-action">
                  {!user ? (
                    <button className="btn btn-primary w-100" onClick={handleLogin}>
                      🔵 Google 帳號登入
                    </button>
                  ) : (
                    <button className="btn btn-secondary w-100" onClick={handleLogout}>
                      🚪 登出
                    </button>
                  )}
                </div>
              </div>

              {/* 資料統計 */}
              <div className="settings-card stats-card">
                <div className="card-header">
                  <h3>📊 資料統計</h3>
                </div>
                <div className="stats-grid-small">
                  <div className="stat-mini-item">
                    <span className="stat-label">總報修</span>
                    <span className="stat-value">{repairs.length}</span>
                  </div>
                  <div className="stat-mini-item">
                    <span className="stat-label">待處理</span>
                    <span className="stat-value pending">{repairs.filter(r => r.status === 'pending').length}</span>
                  </div>
                  <div className="stat-mini-item">
                    <span className="stat-label">已完成</span>
                    <span className="stat-value completed">{repairs.filter(r => r.status === 'completed').length}</span>
                  </div>
                </div>
              </div>

              {/* 管理員名單管理 (僅 Super Admin 可見) */}
              {isAdmin && user?.email === SUPER_ADMIN && (
                <div className="settings-card admin-manage-card full-width">
                  <div className="card-header">
                    <h3>🛡️ 管理員名單管理</h3>
                    <p className="text-muted small">在此新增其他管理員 (如事務組長)，他們將擁有後台管理權限。</p>
                  </div>
                  <div className="card-content">
                    <div className="admin-list">
                      {additionalAdmins.map(email => (
                        <div key={email} className="admin-item">
                          <span>{email}</span>
                          <button
                            className="btn btn-icon btn-danger-soft"
                            onClick={() => handleRemoveAdmin(email)}
                            title="移除"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                      {additionalAdmins.length === 0 && (
                        <p className="empty-hint">目前沒有額外管理員</p>
                      )}
                    </div>
                    <div className="add-admin-form">
                      <input
                        type="email"
                        placeholder="輸入新管理員 Email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        className="form-input"
                      />
                      <button
                        className="btn btn-primary"
                        onClick={handleAddAdmin}
                        disabled={!newAdminEmail}
                      >
                        ➕ 新增
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 通知設定 (僅管理員可見) */}
              {isAdmin && (
                <div className="settings-card notification-card full-width">
                  <div className="card-header">
                    <h3>🔔 Line Notify 通知設定</h3>
                    <div className="notify-tabs-container">
                      <button
                        className={`notify-tab-btn ${notifyTab === 'it' ? 'active' : ''}`}
                        onClick={() => setNotifyTab('it')}
                      >
                        資訊組
                      </button>
                      <button
                        className={`notify-tab-btn ${notifyTab === 'general' ? 'active' : ''}`}
                        onClick={() => setNotifyTab('general')}
                      >
                        事務組
                      </button>
                    </div>
                  </div>
                  <div className="notification-content">
                    {/* 資訊組設定 */}
                    {notifyTab === 'it' && (
                      <div className="notify-section animate-fadeIn">
                        <h4 className="notify-section-title text-purple">🖥️ 資訊組通知 (IT)</h4>
                        <div className="form-group">
                          <label>Channel Access Token</label>
                          <input
                            type="password"
                            value={itLineToken}
                            onChange={(e) => setItLineToken(e.target.value)}
                            placeholder="輸入資訊組 Token"
                            className="form-input"
                          />
                        </div>
                        <div className="form-group" style={{ marginTop: '10px' }}>
                          <label>Target ID (User/Group)</label>
                          <input
                            type="text"
                            value={itTargetId}
                            onChange={(e) => setItTargetId(e.target.value)}
                            placeholder="輸入資訊組 Target ID"
                            className="form-input"
                          />
                        </div>
                      </div>
                    )}

                    {/* 事務組設定 */}
                    {notifyTab === 'general' && (
                      <div className="notify-section animate-fadeIn">
                        <h4 className="notify-section-title text-orange">🔧 事務組通知 (General)</h4>
                        <div className="form-group">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ marginBottom: 0 }}>Channel Access Token</label>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              style={{ fontSize: '0.8rem', padding: '2px 8px' }}
                              onClick={() => {
                                setGeneralLineToken(itLineToken);
                                toast.success('已帶入資訊組 Token');
                              }}
                            >
                              📋 同步資訊組 Token
                            </button>
                          </div>
                          <input
                            type="password"
                            value={generalLineToken}
                            onChange={(e) => setGeneralLineToken(e.target.value)}
                            placeholder="輸入事務組 Token"
                            className="form-input"
                          />
                        </div>
                        <div className="form-group" style={{ marginTop: '10px' }}>
                          <label>Target ID (User/Group)</label>
                          <input
                            type="text"
                            value={generalTargetId}
                            onChange={(e) => setGeneralTargetId(e.target.value)}
                            placeholder="輸入事務組 Target ID"
                            className="form-input"
                          />
                        </div>
                      </div>
                    )}

                    {/* 共用設定 */}
                    <div className="form-group" style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
                      <label>Google Apps Script Proxy URL (共用)</label>
                      <input
                        type="text"
                        value={gasProxy}
                        onChange={(e) => setGasProxy(e.target.value)}
                        placeholder="請輸入 GAS 部署網址"
                        className="form-input"
                      />
                    </div>

                    <div className="form-actions" style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                      <button className="btn btn-primary" onClick={handleSaveNotifySettings}>
                        💾 儲存設定
                      </button>
                      <button className="btn btn-secondary" onClick={async () => {
                        // 測試發送
                        const isIT = notifyTab === 'it';
                        const mockRepairData = {
                          roomCode: 'TEST',
                          roomName: '測試教室',
                          category: isIT ? 'IT' : 'GENERAL',
                          itemName: isIT ? '電腦主機' : '冷氣',
                          description: '這是一則測試通知，確認設定是否正確。',
                          reporterName: '系統測試',
                          priority: 'normal'
                        };

                        const token = isIT ? itLineToken : generalLineToken;
                        const targetId = isIT ? itTargetId : generalTargetId;

                        if (!token || !targetId) {
                          toast.warning('請先輸入 Token 與 Target ID');
                          return;
                        }

                        const res = await sendLineNotification('測試通知', {
                          token,
                          proxyUrl: gasProxy,
                          targetId,
                          repairData: mockRepairData
                        });

                        if (res.success) toast.success(`[${isIT ? '資訊組' : '事務組'}] 測試發送成功！`);
                        else toast.error('測試失敗：' + res.error);
                      }}>
                        🧪 測試發送 ({notifyTab === 'it' ? '資訊' : '事務'})
                      </button>
                    </div>

                    <div className="helper-text" style={{ marginTop: '20px', padding: '15px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                      <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📖 LINE 通知設定教學
                      </h4>

                      <div className="setup-steps" style={{ display: 'grid', gap: '12px' }}>
                        <div className="step-item">
                          <strong>步驟 1：取得 Token (Channel Access Token)</strong>
                          <p style={{ margin: '4px 0 8px 0', fontSize: '0.9rem', color: '#ccc' }}>
                            前往 LINE Developers 建立 Messaging API Channel。
                          </p>
                          <a
                            href="https://developers.line.biz/console/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary"
                            style={{ display: 'inline-block', textDecoration: 'none' }}
                          >
                            🔗 前往 LINE Developers Console
                          </a>
                          <div style={{ fontSize: '0.85rem', marginTop: '6px', color: '#aaa' }}>
                            路徑：選擇 Provider &gt; 建立 Channel (Messaging API) &gt; Messaging API 分頁 &gt; 產生 Channel access token
                          </div>
                        </div>

                        <div className="step-item">
                          <strong>步驟 2：取得 Target ID (User ID / Group ID)</strong>
                          <p style={{ margin: '4px 0 8px 0', fontSize: '0.9rem', color: '#ccc' }}>
                            想通知群組？請先將機器人加入群組，並透過 webhook 取得群組 ID (較進階)。<br />
                            簡單用法：通知個人，請填寫您的 User ID。
                          </p>
                          <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
                            路徑：LINE Developers Console &gt; Basic settings 分頁 &gt; Your user ID
                          </div>
                        </div>

                        <div className="step-item">
                          <strong>步驟 3：設定 Google Apps Script (GAS)</strong>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#ccc' }}>
                            若您是管理員並維護後端，請確保 GAS 程式碼已更新以支援 Messaging API。
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 教室配置圖 (僅管理員可見) */}
              {isAdmin && (
                <div className="settings-card map-config-card full-width">
                  <div className="card-header flex-between">
                    <h3>🗺️ 教室配置圖 (Admin)</h3>
                    <button className="btn btn-sm btn-secondary" onClick={() => setShowEditor(true)}>
                      ✏️ 編輯區域 ({rooms.length})
                    </button>
                  </div>
                  <div className="map-preview-area">
                    <MapUploader onUpload={handleMapUpload} currentImage={mapImage} />
                  </div>
                </div>
              )}

              {/* 危險區域 (僅管理員可見) */}
              {isAdmin && (
                <div className="settings-card danger-zone full-width">
                  <div className="card-header">
                    <h3>⚠️ 危險區域 (Admin)</h3>
                  </div>
                  <div className="danger-content flex-between">
                    <div>
                      <h4>清除所有資料</h4>
                      <p className="danger-warning">此操作將永久刪除所有報修記錄與地圖設定，無法復原。</p>
                    </div>
                    <button className="btn btn-danger" onClick={handleClearData}>
                      🗑️ 確認清除
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* 地圖編輯器 */}
      {showEditor && mapImage && (
        <MapEditor
          imageUrl={mapImage}
          rooms={rooms}
          onSave={handleSaveMapConfig}
          onClose={() => setShowEditor(false)}
          onRoomsChange={handleRoomsChange}
        />
      )}

      {/* 報修表單 */}
      {showRepairForm && selectedRoom && (
        <RepairForm
          room={selectedRoom}
          onSubmit={handleSubmitRepair}
          onClose={() => {
            setShowRepairForm(false);
            setSelectedRoom(null);
          }}
        />
      )}

      {/* 回到頂部按鈕 */}
      <ScrollToTop />
    </div>
  );
}

export default App;
