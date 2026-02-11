import './Skeleton.css';

/**
 * 骨架屏元件 — 資料載入時的佔位 UI
 * @param {string} type - 'card' | 'list' | 'stat' | 'text'
 * @param {number} count - 重複數量
 */
function Skeleton({ type = 'card', count = 3 }) {
    const items = Array.from({ length: count }, (_, i) => i);

    if (type === 'stat') {
        return (
            <div className="skeleton-stats">
                {items.map(i => (
                    <div key={i} className="skeleton-stat-card">
                        <div className="skeleton-circle" />
                        <div className="skeleton-stat-info">
                            <div className="skeleton-line skeleton-line-lg" />
                            <div className="skeleton-line skeleton-line-sm" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'card') {
        return (
            <div className="skeleton-list">
                {items.map(i => (
                    <div key={i} className="skeleton-card">
                        <div className="skeleton-card-header">
                            <div className="skeleton-badge" />
                            <div className="skeleton-line skeleton-line-md" />
                        </div>
                        <div className="skeleton-card-body">
                            <div className="skeleton-line skeleton-line-full" />
                            <div className="skeleton-line skeleton-line-lg" />
                            <div className="skeleton-line skeleton-line-md" />
                        </div>
                        <div className="skeleton-card-footer">
                            <div className="skeleton-line skeleton-line-sm" />
                            <div className="skeleton-line skeleton-line-sm" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // type === 'text'
    return (
        <div className="skeleton-text-block">
            {items.map(i => (
                <div key={i} className="skeleton-line skeleton-line-full" />
            ))}
        </div>
    );
}

export default Skeleton;
