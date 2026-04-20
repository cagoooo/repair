import './AdminRoleSelector.css';

/**
 * 管理員角色選擇器
 * 進入管理後台時跳出，讓資訊組長/事務組長快速切換檢視視角
 */
const AdminRoleSelector = ({ currentRole, repairs, onSelect, onClose, canClose = false }) => {
    // 計算各角色的統計數字
    const countBy = (category, status) => repairs.filter(r =>
        (category === 'ALL' || r.category === category) && r.status === status
    ).length;
    const countTotal = (category) => repairs.filter(r =>
        category === 'ALL' || r.category === category
    ).length;

    const roles = [
        {
            id: 'IT',
            icon: '🖥️',
            name: '資訊組長',
            description: '電腦、螢幕、網路、投影機等資訊設備',
            pending: countBy('IT', 'pending'),
            inProgress: countBy('IT', 'in_progress'),
            total: countTotal('IT'),
            color: '#8b5cf6',
        },
        {
            id: 'GENERAL',
            icon: '🔧',
            name: '事務組長',
            description: '水電、門窗、桌椅、黑板等一般設備',
            pending: countBy('GENERAL', 'pending'),
            inProgress: countBy('GENERAL', 'in_progress'),
            total: countTotal('GENERAL'),
            color: '#f97316',
        },
        {
            id: 'ALL',
            icon: '📊',
            name: '全部檢視',
            description: '不分類，顯示所有報修單與統計',
            pending: countBy('ALL', 'pending'),
            inProgress: countBy('ALL', 'in_progress'),
            total: countTotal('ALL'),
            color: '#3b82f6',
        },
    ];

    return (
        <div className="role-selector-overlay" onClick={canClose ? onClose : undefined}>
            <div className="role-selector-container glass-card" onClick={(e) => e.stopPropagation()}>
                <div className="role-selector-header">
                    <h2>👋 歡迎進入管理後台</h2>
                    <p>請選擇您的檢視角色，只會看到相關的報修項目</p>
                    {canClose && (
                        <button className="role-close-btn" onClick={onClose}>✕</button>
                    )}
                </div>

                <div className="role-cards">
                    {roles.map(role => (
                        <button
                            key={role.id}
                            className={`role-card ${currentRole === role.id ? 'active' : ''}`}
                            style={{ '--role-color': role.color }}
                            onClick={() => onSelect(role.id)}
                        >
                            <div className="role-icon">{role.icon}</div>
                            <div className="role-info">
                                <h3 className="role-name">{role.name}</h3>
                                <p className="role-desc">{role.description}</p>
                                <div className="role-stats">
                                    {role.pending > 0 && (
                                        <span className="role-badge pending">
                                            ⏳ {role.pending} 待處理
                                        </span>
                                    )}
                                    {role.inProgress > 0 && (
                                        <span className="role-badge in-progress">
                                            🔄 {role.inProgress} 處理中
                                        </span>
                                    )}
                                    <span className="role-badge total">
                                        📂 共 {role.total} 筆
                                    </span>
                                </div>
                            </div>
                            <div className="role-arrow">→</div>
                        </button>
                    ))}
                </div>

                <div className="role-footer">
                    <span>💡</span>
                    <span>進入後隨時可在右上角切換檢視角色</span>
                </div>
            </div>
        </div>
    );
};

export default AdminRoleSelector;
