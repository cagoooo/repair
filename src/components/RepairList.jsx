import { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { REPAIR_CATEGORIES, REPAIR_STATUS, REPAIR_PRIORITY } from '../data/repairCategories';
import { useToast } from './Toast';
import RepairPrintDetail from './RepairPrintDetail';
import './RepairList.css';

/**
 * 報修列表元件
 * 顯示所有報修單，支援篩選與狀態更新
 */
function RepairList({ repairs, isAdmin, onUpdateStatus, onViewRoom, onAddComment, onDeleteRepair, highlightRepairId }) {
    const toast = useToast();
    const [filter, setFilter] = useState({
        category: 'all',
        status: 'all',
        search: '',
        dateFrom: '',
        dateTo: ''
    });
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');

    // 篩選後的報修單
    const filteredRepairs = useMemo(() => {
        let result = [...repairs];

        // 類別篩選
        if (filter.category !== 'all') {
            result = result.filter(r => r.category === filter.category);
        }

        // 狀態篩選
        if (filter.status !== 'all') {
            result = result.filter(r => r.status === filter.status);
        } else {
            // [MODIFY] 預設排除 "已取消" 的項目，除非使用者明確選擇該狀態
            // 讓使用者感覺 "撤銷 = 刪除"
            result = result.filter(r => r.status !== 'cancelled');
        }

        // 搜尋
        if (filter.search) {
            const searchLower = filter.search.toLowerCase();
            result = result.filter(r =>
                r.roomCode?.toLowerCase().includes(searchLower) ||
                r.roomName?.toLowerCase().includes(searchLower) ||
                r.description?.toLowerCase().includes(searchLower) ||
                r.reporterName?.toLowerCase().includes(searchLower)
            );
        }

        // 日期範圍篩選
        if (filter.dateFrom) {
            const from = new Date(filter.dateFrom);
            from.setHours(0, 0, 0, 0);
            result = result.filter(r => new Date(r.createdAt) >= from);
        }
        if (filter.dateTo) {
            const to = new Date(filter.dateTo);
            to.setHours(23, 59, 59, 999);
            result = result.filter(r => new Date(r.createdAt) <= to);
        }

        // 排序
        result.sort((a, b) => {
            let comparison = 0;

            if (sortBy === 'createdAt') {
                comparison = new Date(a.createdAt) - new Date(b.createdAt);
            } else if (sortBy === 'priority') {
                const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
                comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
            } else if (sortBy === 'roomCode') {
                comparison = (a.roomCode || '').localeCompare(b.roomCode || '');
            }

            return sortOrder === 'desc' ? -comparison : comparison;
        });

        return result;
    }, [repairs, filter, sortBy, sortOrder]);

    // 統計數據
    const stats = useMemo(() => {
        const pending = repairs.filter(r => r.status === 'pending').length;
        const inProgress = repairs.filter(r => r.status === 'in_progress').length;
        const completed = repairs.filter(r => r.status === 'completed').length;
        const urgent = repairs.filter(r => r.priority === 'urgent' && r.status !== 'completed').length;

        return { pending, inProgress, completed, urgent, total: repairs.length };
    }, [repairs]);

    // 格式化日期
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-TW', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // 取得狀態下一步動作
    const getNextStatus = (currentStatus) => {
        switch (currentStatus) {
            case 'pending': return 'in_progress';
            case 'in_progress': return 'completed';
            default: return null;
        }
    };

    // 圖片預覽狀態
    const [previewImage, setPreviewImage] = useState(null);
    // 展開詳情狀態
    const [expandedId, setExpandedId] = useState(null);
    // 列印狀態
    const [printingRepair, setPrintingRepair] = useState(null);
    // 列表容器 Ref (用於捲動)
    const listRef = useRef(null);

    // 管理員備註輸入
    const [commentText, setCommentText] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    // 各報修單的回覆列表
    const [commentsMap, setCommentsMap] = useState({});

    // 自動展開並捲動到指定報修單 (Deep Linking)
    useEffect(() => {
        if (highlightRepairId && repairs.length > 0) {
            const target = repairs.find(r => r.id === highlightRepairId);
            if (target) {
                setExpandedId(highlightRepairId);
                // 延遲捲動確保 DOM 已渲染
                setTimeout(() => {
                    const el = document.getElementById(`repair-${highlightRepairId}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('highlight-pulse'); // 可選：增加 CSS 動畫提示
                    }
                }, 500);
            }
        }
    }, [highlightRepairId, repairs]);

    // 當展開卡片時，載入 comments
    useEffect(() => {
        if (!expandedId) return;
        const loadComments = async () => {
            try {
                const { db } = await import('../utils/firebase');
                const { collection, getDocs, orderBy, query } = await import('firebase/firestore');
                if (!db) return;
                const q = query(
                    collection(db, 'repairs', expandedId, 'comments'),
                    orderBy('createdAt', 'desc')
                );
                const snap = await getDocs(q);
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setCommentsMap(prev => ({ ...prev, [expandedId]: list }));
            } catch (err) {
                console.error('Error loading comments:', err);
            }
        };
        loadComments();
    }, [expandedId]);

    // 新增備註
    const handleAddComment = async (repairId) => {
        if (!commentText.trim() || !onAddComment) return;
        setCommentLoading(true);
        try {
            await onAddComment(repairId, commentText.trim());
            setCommentText('');
            // 重新載入 comments
            const { db } = await import('../utils/firebase');
            const { collection, getDocs, orderBy, query } = await import('firebase/firestore');
            if (db) {
                const q = query(
                    collection(db, 'repairs', repairId, 'comments'),
                    orderBy('createdAt', 'desc')
                );
                const snap = await getDocs(q);
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setCommentsMap(prev => ({ ...prev, [repairId]: list }));
            }
        } catch (err) {
            console.error('Error adding comment:', err);
            toast.error('備註新增失敗');
        } finally {
            setCommentLoading(false);
        }
    };

    // Excel 匯出
    const handleExportExcel = () => {
        const data = filteredRepairs.map(r => ({
            '報修編號': r.id,
            '教室': `${r.roomCode} ${r.roomName}`,
            '類別': REPAIR_CATEGORIES[r.category]?.name || r.category,
            '項目': r.itemName || r.itemType,
            '描述': r.description,
            '申報人': r.reporterName,
            '聯絡方式': r.reporterContact || '',
            '優先度': REPAIR_PRIORITY[r.priority]?.name || r.priority,
            '狀態': REPAIR_STATUS[r.status]?.name || r.status,
            '建立時間': new Date(r.createdAt).toLocaleString('zh-TW')
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [
            { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 15 },
            { wch: 30 }, { wch: 10 }, { wch: 15 }, { wch: 8 },
            { wch: 10 }, { wch: 20 }
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '報修紀錄');
        XLSX.writeFile(wb, `報修匯出_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // 取得報修單的所有圖片
    const getRepairImages = (repair) => {
        if (repair.imageUrls && repair.imageUrls.length > 0) return repair.imageUrls;
        if (repair.imageUrl) return [repair.imageUrl];
        return [];
    };

    // 處理列印
    const handlePrint = (repair) => {
        setPrintingRepair(repair);
        // 延遲執行列印，確保 DOM 已更新
        setTimeout(() => {
            window.print();
            // 列印對話框關閉後（或立即），重置狀態（視瀏覽器行為而定，通常保持狀態也無妨，因為 CSS 會隱藏）
            // 但為了保險，可以在 window.onafterprint 大約處理，或不重置也行，因為 display:none
        }, 300);
    };

    return (
        <div className="repair-list-container animate-fadeIn">
            {/* 圖片預覽 Modal */}
            {previewImage && (
                <div className="image-modal-overlay" onClick={() => setPreviewImage(null)}>
                    <div className="image-modal-content" onClick={e => e.stopPropagation()}>
                        <img src={previewImage} alt="Repair Detail" />
                        <button className="close-modal-btn" onClick={() => setPreviewImage(null)}>✕</button>
                    </div>
                </div>
            )}

            {/* 統計卡片 */}
            <div className="stats-container">
                <div className="stat-card pending">
                    <div className="stat-icon-wrapper">⏳</div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.pending}</span>
                        <span className="stat-label">待處理</span>
                    </div>
                </div>
                <div className="stat-card in-progress">
                    <div className="stat-icon-wrapper">🔄</div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.inProgress}</span>
                        <span className="stat-label">處理中</span>
                    </div>
                </div>
                <div className="stat-card completed">
                    <div className="stat-icon-wrapper">✅</div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.completed}</span>
                        <span className="stat-label">已完成</span>
                    </div>
                </div>
                <div className="stat-card urgent">
                    <div className="stat-icon-wrapper">🔥</div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.urgent}</span>
                        <span className="stat-label">緊急案件</span>
                    </div>
                </div>
            </div>

            {/* 篩選工具列 */}
            <div className="filter-toolbar glass-card">
                {/* ... (existing filter toolbar) ... */}
                <div className="filter-search">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="搜尋教室、描述或申報人..."
                        value={filter.search}
                        onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                    />
                </div>

                <div className="filter-actions">
                    <select
                        className="filter-select"
                        value={filter.category}
                        onChange={(e) => setFilter(prev => ({ ...prev, category: e.target.value }))}
                    >
                        <option value="all">📁 全部類別</option>
                        {Object.values(REPAIR_CATEGORIES).map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                        ))}
                    </select>

                    <select
                        className="filter-select"
                        value={filter.status}
                        onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                    >
                        <option value="all">📊 全部狀態</option>
                        {Object.entries(REPAIR_STATUS).map(([key, value]) => (
                            <option key={key} value={key}>{value.icon} {value.name}</option>
                        ))}
                    </select>

                    <select
                        className="filter-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="createdAt">🕒 最新優先</option>
                        <option value="priority">🔥 緊急優先</option>
                        <option value="roomCode">🏫 教室代號</option>
                    </select>
                </div>

                {/* 日期範圍篩選 + Excel 匯出 */}
                <div className="filter-row-bottom">
                    <div className="date-range-filter">
                        <span className="date-label">📅</span>
                        <input
                            type="date"
                            className="filter-date"
                            value={filter.dateFrom}
                            onChange={(e) => setFilter(prev => ({ ...prev, dateFrom: e.target.value }))}
                        />
                        <span className="date-separator">—</span>
                        <input
                            type="date"
                            className="filter-date"
                            value={filter.dateTo}
                            onChange={(e) => setFilter(prev => ({ ...prev, dateTo: e.target.value }))}
                        />
                        {(filter.dateFrom || filter.dateTo) && (
                            <button
                                className="clear-date-btn"
                                onClick={() => setFilter(prev => ({ ...prev, dateFrom: '', dateTo: '' }))}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    {isAdmin && (
                        <button className="btn btn-export" onClick={handleExportExcel}>
                            📥 匯出 Excel ({filteredRepairs.length})
                        </button>
                    )}
                </div>
            </div>

            {/* 報修列表 */}
            <div className="repair-list">
                {filteredRepairs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h3>目前沒有符合條件的報修單</h3>
                        <p>試著調整篩選條件，或是切換到地圖頁面新增報修。</p>
                        <button className="btn btn-primary mt-2" onClick={() => onViewRoom(null)}>
                            🗺️ 前往地圖報修
                        </button>
                    </div>
                ) : (
                    filteredRepairs.map(repair => {
                        const images = getRepairImages(repair);
                        const isExpanded = expandedId === repair.id;
                        const comments = commentsMap[repair.id] || [];

                        return (
                            <div key={repair.id} id={`repair-${repair.id}`} className={`repair-card ${repair.priority} ${isExpanded ? 'expanded' : ''}`}>
                                <div className="repair-status-line" data-status={repair.status}></div>

                                {/* 卡片頂部 - 點擊展開 */}
                                <div className="repair-card-header" onClick={() => setExpandedId(isExpanded ? null : repair.id)}>
                                    <div className="repair-room-badge" onClick={(e) => { e.stopPropagation(); onViewRoom(repair.roomId); }}>
                                        <span className="room-code">{repair.roomCode}</span>
                                        <span className="room-name">{repair.roomName}</span>
                                    </div>
                                    {images.length > 0 && (
                                        <div className="repair-thumbnail" onClick={(e) => { e.stopPropagation(); setPreviewImage(images[0]); }}>
                                            <img src={images[0]} alt="證據" />
                                            {images.length > 1 && (
                                                <span className="image-count-badge">+{images.length - 1}</span>
                                            )}
                                        </div>
                                    )}
                                    <span>📅 {formatDate(repair.createdAt)}</span>
                                    <span className={`expand-arrow ${isExpanded ? 'open' : ''}`}>▼</span>
                                </div>

                                {/* 卡片內容 */}
                                <div className="repair-card-body">
                                    <div className="repair-info-row">
                                        <span className="repair-category">
                                            {REPAIR_CATEGORIES[repair.category]?.icon} {REPAIR_CATEGORIES[repair.category]?.name}
                                            <span className="repair-item-name"> - {repair.itemName || repair.itemType}</span>
                                        </span>
                                        <span className={`repair-status-badge ${repair.status}`}>
                                            {REPAIR_STATUS[repair.status]?.name}
                                        </span>
                                    </div>
                                    <p className="repair-description">{repair.description}</p>
                                    <div className="repair-footer">
                                        <span className="reporter-name">👤 {repair.reporterName}</span>
                                        {repair.reporterContact && <span className="reporter-contact">📞 {repair.reporterContact}</span>}
                                    </div>
                                </div>

                                {/* 展開詳情區 */}
                                {isExpanded && (
                                    <div className="repair-detail-panel">
                                        {/* 多圖畫廊 */}
                                        {images.length > 0 && (
                                            <div className="detail-section">
                                                <h4>📷 現場照片</h4>
                                                <div className="detail-image-gallery">
                                                    {images.map((url, idx) => (
                                                        <div key={idx} className="gallery-item" onClick={() => setPreviewImage(url)}>
                                                            <img src={url} alt={`照片 ${idx + 1}`} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 時間軸 */}
                                        <div className="detail-section">
                                            <h4>🕒 處理時間軸</h4>
                                            <div className="timeline">
                                                <div className="timeline-item active">
                                                    <div className="timeline-dot"></div>
                                                    <div className="timeline-content">
                                                        <span className="timeline-label">提交報修</span>
                                                        <span className="timeline-date">{formatDate(repair.createdAt)}</span>
                                                    </div>
                                                </div>
                                                <div className={`timeline-item ${repair.status === 'in_progress' || repair.status === 'completed' ? 'active' : ''}`}>
                                                    <div className="timeline-dot"></div>
                                                    <div className="timeline-content">
                                                        <span className="timeline-label">開始處理</span>
                                                        <span className="timeline-date">
                                                            {repair.startedAt ? formatDate(repair.startedAt) : '尚未開始'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className={`timeline-item ${repair.status === 'completed' ? 'active' : ''}`}>
                                                    <div className="timeline-dot"></div>
                                                    <div className="timeline-content">
                                                        <span className="timeline-label">完成修復</span>
                                                        <span className="timeline-date">
                                                            {repair.completedAt ? formatDate(repair.completedAt) : '尚未完成'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 管理員備註區 */}
                                        <div className="detail-section">
                                            <h4>💬 處理備註 ({comments.length})</h4>
                                            <div className="comments-list">
                                                {comments.length === 0 && (
                                                    <p className="no-comments">尚無備註</p>
                                                )}
                                                {comments.map(c => (
                                                    <div key={c.id} className="comment-item">
                                                        <div className="comment-header">
                                                            <span className="comment-author">👤 {c.author || '管理員'}</span>
                                                            <span className="comment-date">{c.createdAt ? formatDate(c.createdAt) : ''}</span>
                                                        </div>
                                                        <p className="comment-text">{c.text}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            {isAdmin && onAddComment && (
                                                <div className="comment-input-area">
                                                    <input
                                                        type="text"
                                                        className="comment-input"
                                                        placeholder="輸入處理備註..."
                                                        value={commentText}
                                                        onChange={(e) => setCommentText(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(repair.id)}
                                                    />
                                                    <button
                                                        className="btn btn-sm btn-comment"
                                                        onClick={() => handleAddComment(repair.id)}
                                                        disabled={commentLoading || !commentText.trim()}
                                                    >
                                                        {commentLoading ? '…' : '📨'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* 管理員操作按鈕 */}
                                {isAdmin && repair.status !== 'completed' && repair.status !== 'cancelled' && (
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => onUpdateStatus(repair.id, getNextStatus(repair.status))}
                                    >
                                        {repair.status === 'pending' ? '🔄 開始處理' : '✅ 標記完成'}
                                    </button>
                                )}

                                {/* 使用者撤銷按鈕 (若是自己的報修且狀態為 pending) */}
                                {!isAdmin && repair.isMine && repair.status === 'pending' && (
                                    <button
                                        className="btn btn-danger btn-sm"
                                        style={{ marginLeft: '10px', backgroundColor: '#ff6b6b' }}
                                        onClick={() => onDeleteRepair(repair.id)}
                                    >
                                        🗑️ 撤銷申請
                                    </button>
                                )}

                                {/* 管理員刪除按鈕 */}
                                {isAdmin && (
                                    <button
                                        className="btn btn-danger btn-sm"
                                        style={{ marginLeft: '10px' }}
                                        onClick={() => onDeleteRepair(repair.id)}
                                    >
                                        ❌ 刪除
                                    </button>
                                )}

                                {/* 列印按鈕 (所有人皆可見) */}
                                {isExpanded && (
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        style={{ marginLeft: '10px' }}
                                        onClick={() => handlePrint(repair)}
                                    >
                                        🖨️ 列印報修單
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* 列印用容器 (僅在列印時顯示) */}
            <div className={`print-container-wrapper ${printingRepair ? 'printing' : ''}`}>
                <RepairPrintDetail repair={printingRepair} />
            </div>
        </div>
    );
}

export default RepairList;
