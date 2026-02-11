import { useState, useMemo } from 'react';
import { REPAIR_CATEGORIES, REPAIR_STATUS, REPAIR_PRIORITY } from '../data/repairCategories';
import './RepairList.css';

/**
 * 報修列表元件
 * 顯示所有報修單，支援篩選與狀態更新
 */
function RepairList({ repairs, isAdmin, onUpdateStatus, onViewRoom }) {
    const [filter, setFilter] = useState({
        category: 'all',
        status: 'all',
        search: ''
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
                    filteredRepairs.map(repair => (
                        <div key={repair.id} className={`repair-card ${repair.priority}`}>
                            <div className="repair-status-line" data-status={repair.status}></div>

                            <div className="repair-card-header">
                                <div className="repair-room-badge" onClick={() => onViewRoom(repair.roomId)}>
                                    <span className="room-code">{repair.roomCode}</span>
                                    <span className="room-name">{repair.roomName}</span>
                                </div>
                                {repair.imageUrl && (
                                    <div className="repair-thumbnail" onClick={(e) => { e.stopPropagation(); setPreviewImage(repair.imageUrl); }}>
                                        <img src={repair.imageUrl} alt="證據" />
                                    </div>
                                )}
                                <span>📅 {formatDate(repair.createdAt)}</span>
                            </div>

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

                            {isAdmin && repair.status !== 'completed' && repair.status !== 'cancelled' && (
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => onUpdateStatus(repair.id, getNextStatus(repair.status))}
                                >
                                    {repair.status === 'pending' ? '🔄 開始處理' : '✅ 標記完成'}
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default RepairList;
