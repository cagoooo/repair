import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { REPAIR_CATEGORIES, REPAIR_STATUS } from '../data/repairCategories';
import './AdminDashboard.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

/**
 * 管理員後台儀表板
 * 提供報修統計、列表管理、狀態更新等功能
 */
function AdminDashboard({ repairs, rooms, onUpdateStatus, onDeleteRepair }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [previewImage, setPreviewImage] = useState(null);

    // 計算統計數據
    const stats = useMemo(() => {
        // 基礎統計
        const basic = {
            pending: repairs.filter(r => r.status === 'pending').length,
            inProgress: repairs.filter(r => r.status === 'in_progress').length,
            completed: repairs.filter(r => r.status === 'completed').length,
            urgent: repairs.filter(r => r.priority === 'urgent' && r.status !== 'completed').length
        };

        // 類別分佈 (Pie Chart)
        const categoryData = Object.values(REPAIR_CATEGORIES).map(cat => ({
            name: cat.name,
            value: repairs.filter(r => r.category === cat.id).length
        })).filter(d => d.value > 0);

        // 近七日趨勢 (Bar Chart)
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
        }).reverse();

        const trendData = last7Days.map(dateStr => {
            return {
                name: dateStr,
                count: repairs.filter(r => {
                    const rDate = new Date(r.createdAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
                    return rDate === dateStr;
                }).length
            };
        });

        return { ...basic, categoryData, trendData };
    }, [repairs]);

    // 篩選與排序邏輯
    const filteredRepairs = useMemo(() => {
        return repairs.filter(repair => {
            const matchSearch =
                repair.roomCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                repair.roomName.includes(searchTerm) ||
                repair.description.includes(searchTerm) ||
                repair.reporterName.includes(searchTerm);

            const matchCategory = categoryFilter === 'all' || repair.category === categoryFilter;
            const matchStatus = statusFilter === 'all' || repair.status === statusFilter;

            return matchSearch && matchCategory && matchStatus;
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [repairs, searchTerm, categoryFilter, statusFilter]);

    // 取得類別名稱
    const getCategoryName = (catId) => {
        const cat = REPAIR_CATEGORIES[catId];
        return cat ? cat.name : catId;
    };

    // 取得項目名稱
    const getItemName = (catId, itemId) => {
        const cat = REPAIR_CATEGORIES[catId];
        if (!cat) return itemId;
        const item = cat.items.find(i => i.id === itemId);
        return item ? item.name : itemId;
    };

    // 匯出 Excel
    const handleExportExcel = () => {
        const data = filteredRepairs.map(r => ({
            '報修編號': r.id,
            '教室': `${r.roomCode} ${r.roomName}`,
            '類別': getCategoryName(r.category),
            '項目': getItemName(r.category, r.item),
            '描述': r.description,
            '申報人': r.reporterName,
            '優先度': r.priority === 'urgent' ? '緊急' : '普通',
            '狀態': REPAIR_STATUS[r.status]?.label || r.status,
            '建立時間': new Date(r.createdAt).toLocaleString()
        }));

        const ws = XLSX.utils.json_to_sheet(data);

        // 設定欄寬
        const wscols = [
            { wch: 10 }, // ID
            { wch: 15 }, // 教室
            { wch: 10 }, // 類別
            { wch: 15 }, // 項目
            { wch: 30 }, // 描述
            { wch: 10 }, // 申報人
            { wch: 8 },  // 優先度
            { wch: 10 }, // 狀態
            { wch: 20 }  // 時間
        ];
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "報修紀錄");
        XLSX.writeFile(wb, `報修匯出_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="admin-dashboard animate-fadeIn">
            <header className="admin-header">
                <div className="admin-title">
                    <h2>📊 管理員儀表板</h2>
                    <span className="badge badge-primary">Admin</span>
                </div>
                <div className="admin-actions">
                    <button className="btn btn-export" onClick={handleExportExcel}>
                        📥 匯出 Excel
                    </button>
                </div>
            </header>

            {/* 圖片預覽 Modal */}
            {previewImage && (
                <div className="image-modal-overlay" onClick={() => setPreviewImage(null)}>
                    <div className="image-modal-content" onClick={e => e.stopPropagation()}>
                        <img src={previewImage} alt="Repair Detail" />
                        <button className="close-modal-btn" onClick={() => setPreviewImage(null)}>✕</button>
                    </div>
                </div>
            )}

            {/* 統計卡片區域 */}
            <div className="stats-container">
                <div className="stat-card pending">
                    <div className="stat-icon">🕒</div>
                    <div className="stat-info">
                        <span className="stat-label">待處理</span>
                        <span className="stat-value">{stats.pending}</span>
                    </div>
                </div>
                <div className="stat-card in-progress">
                    <div className="stat-icon">🔧</div>
                    <div className="stat-info">
                        <span className="stat-label">處理中</span>
                        <span className="stat-value">{stats.inProgress}</span>
                    </div>
                </div>
                <div className="stat-card completed">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                        <span className="stat-label">已完成</span>
                        <span className="stat-value">{stats.completed}</span>
                    </div>
                </div>
                <div className="stat-card urgent">
                    <div className="stat-icon">🔥</div>
                    <div className="stat-info">
                        <span className="stat-label">緊急案件</span>
                        <span className="stat-value">{stats.urgent}</span>
                    </div>
                </div>
            </div>

            {/* 圖表區域 (New) */}
            <div className="charts-container">
                <div className="chart-card">
                    <h3>📊 報修類別分佈</h3>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={stats.categoryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {stats.categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="chart-card">
                    <h3>📈 近七日報修趨勢</h3>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                data={stats.trendData}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Legend />
                                <Bar dataKey="count" name="報修數" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 篩選工具 */}
            <div className="filter-toolbar">
                <div className="filter-group search-group">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="搜尋教室、描述或申報人..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <select
                        className="form-select filter-select"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="all">所有類別</option>
                        {Object.values(REPAIR_CATEGORIES).map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <select
                        className={`form-select status-select ${statusFilter}`}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">所有狀態</option>
                        <option value="pending">🕒 待處理</option>
                        <option value="in_progress">🔧 處理中</option>
                        <option value="completed">✅ 已完成</option>
                    </select>
                </div>
            </div>

            {/* 報修列表 - RWD 表格/卡片 */}
            {/* 報修列表 - RWD 表格/卡片 */}
            <div className="repair-table-container custom-scrollbar">
                {filteredRepairs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📝</div>
                        <h3>沒有找到符合條件的報修紀錄</h3>
                    </div>
                ) : (
                    <>
                        {/* 電腦版表格 */}
                        <table className="repair-table desktop-view">
                            <thead>
                                <tr>
                                    <th>日期</th>
                                    <th>圖片</th>
                                    <th>教室</th>
                                    <th>類別/項目</th>
                                    <th>描述</th>
                                    <th>申報人</th>
                                    <th>優先度</th>
                                    <th>狀態</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRepairs.map(repair => (
                                    <tr key={repair.id} className={`repair-row ${repair.priority === 'urgent' ? 'row-urgent' : ''}`}>
                                        <td>{new Date(repair.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            {repair.imageUrl ? (
                                                <div className="admin-thumbnail" onClick={() => setPreviewImage(repair.imageUrl)}>
                                                    <img src={repair.imageUrl} alt="證據" />
                                                </div>
                                            ) : (
                                                <span className="no-image">-</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="room-info">
                                                <span className="room-code">{repair.roomCode}</span>
                                                <span className="room-name">{repair.roomName}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="category-info">
                                                <span className="category-name">{getCategoryName(repair.category)}</span>
                                                <span className="item-name">{getItemName(repair.category, repair.item)}</span>
                                            </div>
                                        </td>
                                        <td className="description-cell" title={repair.description}>
                                            {repair.description}
                                        </td>
                                        <td>{repair.reporterName}</td>
                                        <td>
                                            {repair.priority === 'urgent' && (
                                                <span className="badge badge-urgent">🔥 緊急</span>
                                            )}
                                        </td>
                                        <td>
                                            <select
                                                className={`status-badge status-${repair.status}`}
                                                value={repair.status}
                                                onChange={(e) => onUpdateStatus(repair.id, e.target.value)}
                                            >
                                                <option value="pending">🕒 待處理</option>
                                                <option value="in_progress">🔧 處理中</option>
                                                <option value="completed">✅ 已完成</option>
                                            </select>
                                        </td>
                                        <td>
                                            <button
                                                className="btn-icon delete"
                                                onClick={() => {
                                                    if (window.confirm('確定要刪除此報修單嗎？此動作無法復原。')) {
                                                        onDeleteRepair(repair.id);
                                                    }
                                                }}
                                                title="刪除"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* 手機版卡片視圖 */}
                        <div className="mobile-card-view">
                            {filteredRepairs.map(repair => (
                                <div key={repair.id} className={`mobile-repair-card ${repair.priority === 'urgent' ? 'card-urgent' : ''}`}>
                                    <div className="card-header">
                                        <div className="header-left">
                                            <div className="room-info">
                                                <span className="room-code">{repair.roomCode}</span>
                                                <span className="room-name">{repair.roomName}</span>
                                            </div>
                                        </div>
                                        <span className="date-badge">{new Date(repair.createdAt).toLocaleDateString()}</span>
                                    </div>

                                    {repair.imageUrl && (
                                        <div className="mobile-thumbnail" onClick={() => setPreviewImage(repair.imageUrl)}>
                                            <img src={repair.imageUrl} alt="證據" />
                                        </div>
                                    )}

                                    <div className="card-body">
                                        <div className="info-row">
                                            <span className="label">項目：</span>
                                            <span className="value">
                                                {getCategoryName(repair.category)} - {getItemName(repair.category, repair.item)}
                                            </span>
                                        </div>
                                        <div className="info-row description">
                                            <span className="label">描述：</span>
                                            <span className="value">{repair.description}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="label">申報人：</span>
                                            <span className="value">{repair.reporterName}</span>
                                        </div>
                                    </div>

                                    <div className="card-footer">
                                        <div className="status-control">
                                            <select
                                                className={`status-badge status-${repair.status}`}
                                                value={repair.status}
                                                onChange={(e) => onUpdateStatus(repair.id, e.target.value)}
                                            >
                                                <option value="pending">待處理</option>
                                                <option value="in_progress">處理中</option>
                                                <option value="completed">完成</option>
                                            </select>
                                        </div>
                                        <div className="actions">
                                            {repair.priority === 'urgent' && <span className="badge badge-urgent">🔥 緊急</span>}
                                            <button
                                                className="btn-icon delete"
                                                onClick={() => {
                                                    if (window.confirm('確定要刪除此報修單嗎？')) {
                                                        onDeleteRepair(repair.id);
                                                    }
                                                }}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="table-footer">
                <small>顯示 {filteredRepairs.length} 筆資料 (共 {repairs.length} 筆)</small>
            </div>
        </div>
    );
}

export default AdminDashboard;
