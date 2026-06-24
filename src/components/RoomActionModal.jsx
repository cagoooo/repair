import './RoomActionModal.css';

/**
 * 教室點擊後的動作選擇彈窗
 * 當被點擊的教室已有待處理／急修報修時，先讓使用者選擇：
 *  - 查看該教室的詳細報修進度（跳轉列表並自動篩選）
 *  - 或是直接新增一筆報修
 * 讓一般訪客不必切到列表頁就能掌握該教室的維修狀態。
 */
function RoomActionModal({ room, pendingCount, urgentCount, onViewDetails, onNewRepair, onClose }) {
    if (!room) return null;

    // 去掉名稱開頭重複的代碼，僅顯示純名稱
    const pureName = room.name && room.name.startsWith(room.code)
        ? room.name.slice(room.code.length).trim()
        : room.name;

    const hasUrgent = urgentCount > 0;

    return (
        <div className="room-action-overlay" onClick={onClose}>
            <div
                className="room-action-card"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <button className="ram-close" onClick={onClose} aria-label="關閉">✕</button>

                <div className="ram-header">
                    <div className="ram-room">
                        <span className="ram-code">{room.code}</span>
                        {pureName && <span className="ram-name">{pureName}</span>}
                    </div>
                    <div className={`ram-status-pill ${hasUrgent ? 'urgent' : 'pending'}`}>
                        {hasUrgent ? '🔴' : '🟠'}
                        <span>
                            目前有 <strong>{pendingCount}</strong> 件未完成
                            {hasUrgent && <em>（含 {urgentCount} 件急修）</em>}
                        </span>
                    </div>
                </div>

                <p className="ram-subtitle">請選擇您要進行的操作</p>

                <div className="ram-actions">
                    <button className="ram-action-btn view" onClick={onViewDetails}>
                        <span className="ram-action-icon">📋</span>
                        <span className="ram-action-text">
                            <span className="ram-action-title">查看報修進度</span>
                            <span className="ram-action-desc">直接看這間教室的所有報修內容與處理狀態</span>
                        </span>
                        <span className="ram-action-arrow">→</span>
                    </button>

                    <button className="ram-action-btn report" onClick={onNewRepair}>
                        <span className="ram-action-icon">📝</span>
                        <span className="ram-action-text">
                            <span className="ram-action-title">我要新報修</span>
                            <span className="ram-action-desc">這間教室有新的問題，填寫一筆新的報修單</span>
                        </span>
                        <span className="ram-action-arrow">→</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default RoomActionModal;
