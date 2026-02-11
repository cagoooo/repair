import { useState, useEffect } from 'react';
import InteractiveMap from './components/InteractiveMap';
import MapEditor from './components/MapEditor';
import MapUploader from './components/MapUploader';
import RepairForm from './components/RepairForm';
import RepairList from './components/RepairList';
import AdminDashboard from './components/AdminDashboard';
import Skeleton from './components/Skeleton';
import { useToast } from './components/Toast';
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

function App() {
  // Toast 通知
  const toast = useToast();

  // 狀態
  const [activeTab, setActiveTab] = useState('map');
  const [mapImage, setMapImage] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [showRepairForm, setShowRepairForm] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showSetup, setShowSetup] = useState(false);

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // 通知設定狀態
  const [lineToken, setLineToken] = useState('');
  const [lineTargetId, setLineTargetId] = useState('');
  const [gasProxy, setGasProxy] = useState('https://us-central1-smes-e1dc3.cloudfunctions.net/sendLineNotification');

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
            if (data.lineToken) setLineToken(data.lineToken);
            if (data.targetId) setLineTargetId(data.targetId);
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

      if (savedToken) setLineToken(savedToken);
      if (savedTargetId) setLineTargetId(savedTargetId);
      if (savedProxy) setGasProxy(savedProxy);
    };

    fetchSettings();
  }, [db]);

  // 儲存通知設定
  // 儲存通知設定 (到 Firestore + 本地備份)
  const handleSaveNotifySettings = async () => {
    // 儲存到本地 (作為備份)
    localStorage.setItem('line_notify_token', lineToken);
    localStorage.setItem('line_target_id', lineTargetId);
    localStorage.setItem('gas_proxy_url', gasProxy);

    // 儲存到雲端 (主要儲存)
    if (db && isAdmin) {
      try {
        await setDoc(doc(db, 'system', 'notificationConfig'), {
          lineToken: lineToken,
          targetId: lineTargetId,
          gasProxy: gasProxy,
          updatedAt: new Date().toISOString()
        });
        toast.success('通知設定已儲存到雲端！(跟隨帳號，換電腦也有效)');
      } catch (error) {
        console.error('儲存到雲端失敗:', error);
        toast.warning('已儲存到本地，但雲端同步失敗：' + error.message);
      }
    } else {
      toast.warning('已儲存到本地 (未登入管理員或資料庫未連線，無法同步到雲端)');
    }
  };

  // 監聽登入狀態
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      // 權限控管：僅允許特定 Email 成為管理員
      const adminEmail = 'ipad@mail2.smes.tyc.edu.tw';
      if (currentUser && currentUser.email === adminEmail) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

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
      const repairsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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

      setRepairs(repairsData);
      setIsLoading(false);
    }, (error) => {
      console.error("讀取報修資料錯誤:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

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
      } else {
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
    if (!db) { toast.error('無資料庫連線'); return; }

    // 前端 Rate Limiting
    const now = Date.now();
    if (now - lastSubmitRef.current < 30000) {
      toast.warning('提交過於頻繁，請稍候 30 秒再試');
      return;
    }
    lastSubmitRef.current = now;

    try {
      await addDoc(collection(db, 'repairs'), {
        ...repairData,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      // 不需手動 setRepairs，onSnapshot 會自動更新
      setShowRepairForm(false);
      setSelectedRoom(null);

      // 發送 Line 通知
      try {
        const message = `\n[新報修通知]\n地點: ${repairData.roomCode} ${repairData.roomName}\n類別: ${repairData.category}\n項目: ${repairData.item}\n描述: ${repairData.description}\n申報人: ${repairData.reporterName}`;
        await sendLineNotification(message, {
          token: lineToken,
          proxyUrl: gasProxy,
          targetId: lineTargetId,
          repairData: repairData
        });
      } catch (notifyError) {
        console.error('Notification failed:', notifyError);
      }
    } catch (e) {
      console.error('報修提交失敗:', e);
      toast.error('報修提交失敗');
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
  const handleDeleteRepair = async (repairId) => {
    if (!isAdmin) {
      toast.warning('權限不足：僅管理員可刪除報修單');
      return;
    }
    if (!confirm('確定要刪除此報修單嗎？')) return;
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'repairs', repairId));
    } catch (e) {
      console.error('刪除失敗:', e);
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

              {/* 通知設定 (僅管理員可見) */}
              {isAdmin && (
                <div className="settings-card notification-card full-width">
                  <div className="card-header">
                    <h3>🔔 Line Notify 通知設定</h3>
                  </div>
                  <div className="notification-content">
                    <div className="form-group">
                      <label>Channel Access Token (原 Line Notify Token)</label>
                      <input
                        type="password"
                        value={lineToken}
                        onChange={(e) => setLineToken(e.target.value)}
                        placeholder="請輸入 Channel Access Token"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group" style={{ marginTop: '10px' }}>
                      <label>Target ID (User ID / Group ID)</label>
                      <input
                        type="text"
                        value={lineTargetId}
                        onChange={(e) => setLineTargetId(e.target.value)}
                        placeholder="請輸入 User ID 或 Group ID (若使用舊版 Notify 可留空)"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group" style={{ marginTop: '10px' }}>
                      <label>Google Apps Script Proxy URL</label>
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
                        // Mock Data for Testing Flex Message
                        const mockRepairData = {
                          roomCode: 'A101',
                          roomName: '一年一班',
                          category: '事務組',
                          itemName: '冷氣',
                          description: '冷氣無法啟動，顯示 E4 錯誤代碼',
                          reporterName: '測試人員',
                          priority: 'urgent'
                        };
                        const res = await sendLineNotification('這是測試訊息（若您看到此行，代表 Flex Message 尚未生效）', {
                          token: lineToken,
                          proxyUrl: gasProxy,
                          targetId: lineTargetId,
                          repairData: mockRepairData
                        });

                        if (res.success) toast.success('測試發送成功！請檢查手機是否收到「卡片式」通知。');
                        else toast.error('測試失敗：' + res.error);
                      }}>
                        🧪 測試發送 (Flex Message)
                      </button>
                    </div>
                    <div className="helper-text" style={{ marginTop: '10px', fontSize: '0.85rem', color: '#aaa', lineHeight: '1.4' }}>
                      <p>📝 設定步驟 (因 Line Notify 已於 2025/3 結束服務，請改用 Messaging API)：</p>
                      <ol style={{ paddingLeft: '20px', margin: '5px 0' }}>
                        <li>前往 <a href="https://developers.line.biz/" target="_blank" style={{ color: '#60a5fa' }}>LINE Developers Console</a> 建立 Provider & Channel (Messaging API)。</li>
                        <li>在 Channel settings 中取得 <strong>Channel Access Token (Long-lived)</strong>。</li>
                        <li>若要發給自己，請複製 <strong>Your User ID</strong> 填入 Target ID。</li>
                        <li>更新 <a href="https://script.google.com/" target="_blank" style={{ color: '#60a5fa' }}>Google Apps Script</a> Proxy (請複製 notificationService.js 中的新代碼)。</li>
                      </ol>
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

      {/* 頁尾 */}
      <footer className="app-footer">
        <p>校園報修系統 © 2026 | Made with ❤️</p>
      </footer>

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
    </div>
  );
}

export default App;
