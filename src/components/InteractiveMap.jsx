import { useState, useRef, useEffect, useCallback } from 'react';
import './InteractiveMap.css';

/**
 * 互動式地圖元件 (唯讀模式)
 * 允許使用者點擊教室進行報修
 */
function InteractiveMap({ imageUrl, rooms, repairs, onRoomClick, onEditMap }) {
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [selectedRoomId, setSelectedRoomId] = useState(null);
    const containerRef = useRef(null);
    const contentRef = useRef(null);

    // Zoom Handling (Wheel)
    const handleWheel = useCallback((e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const scaleAmount = -e.deltaY * 0.0015;
            setTransform(t => ({
                ...t,
                scale: Math.max(0.3, Math.min(5, t.scale + scaleAmount))
            }));
        }
    }, []);

    // Zoom level for CSS classes
    const zoomLevel = transform.scale < 0.8 ? 'low' : transform.scale > 2 ? 'high' : 'medium';

    // Drag to Pan
    const handleMouseDown = (e) => {
        if (e.target.closest('.room-interactive')) return;

        setIsDragging(true);
        setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
        e.preventDefault(); 
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setTransform(prev => ({
            ...prev,
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        }));
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Category Colors
    const getCategoryColor = (category) => {
        switch (category) {
            case 'classroom': return 'rgba(59, 130, 246, 0.6)';
            case 'office': return 'rgba(139, 92, 246, 0.6)';
            case 'special': return 'rgba(16, 185, 129, 0.6)';
            case 'utility': return 'rgba(107, 114, 128, 0.6)';
            default: return 'rgba(245, 158, 11, 0.6)';
        }
    };

    // Compute room status and repair count
    const getRoomData = (room) => {
        if (!repairs || repairs.length === 0) return { status: 'normal', count: 0 };

        const roomRepairs = repairs.filter(r => {
            if (r.status === 'completed' || r.status === 'cancelled') return false;
            if (r.roomCode && room.code) return r.roomCode === room.code;
            return r.roomName === room.name;
        });

        const count = roomRepairs.length;
        let status = 'normal';

        if (count > 0) {
            const hasUrgent = roomRepairs.some(r => r.priority === 'urgent');
            status = hasUrgent ? 'urgent' : 'pending';
        }

        return { status, count };
    };

    if (!imageUrl) {
        return (
            <div className="map-placeholder">
                <div className="placeholder-content">
                    <span className="placeholder-icon">🗺️</span>
                    <h3>尚未設定地圖</h3>
                    <p>請聯繫管理員上傳學校平面圖</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`interactive-map-container zoom-${zoomLevel}`}>
            {onEditMap && (
                <button
                    className="map-edit-btn"
                    onClick={onEditMap}
                >
                    ✏️ 編輯地圖
                </button>
            )}
            <div
                className={`map-wrapper ${isDragging ? 'is-dragging' : ''}`}
                ref={containerRef}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
                <div
                    className="map-content"
                    ref={contentRef}
                    style={{
                        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                        transformOrigin: 'top left',
                        transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)'
                    }}
                >
                    <img
                        src={imageUrl}
                        alt="School Map"
                        className="map-image"
                        draggable={false}
                    />

                    {rooms.map(room => {
                        const { status, count } = getRoomData(room);
                        const isSelected = selectedRoomId === room.id;

                        return (
                            <div
                                key={room.id}
                                className={`room-interactive status-${status} ${isSelected ? 'selected' : ''}`}
                                style={{
                                    left: `${room.bounds.x}%`,
                                    top: `${room.bounds.y}%`,
                                    width: `${room.bounds.width}%`,
                                    height: `${room.bounds.height}%`,
                                    backgroundColor: status === 'normal' ? getCategoryColor(room.category) : undefined,
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRoomId(room.id);
                                    onRoomClick(room);
                                }}
                                title={`${room.name} (${room.code}) - ${count} 件待修`}
                            >
                                <div className="room-label-container">
                                    <div className="room-label-box">
                                        <span className="room-label code">{room.code}</span>
                                    </div>
                                </div>

                                {count > 0 && (
                                    <div className="repair-count">
                                        {count}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <div className="map-controls-hint">
                💡 {navigator.maxTouchPoints > 0 ? '雙指縮放或拖動地圖' : 'Ctrl + 滾輪縮放，拖動地圖移動'}
            </div>
        </div>
    );
}

export default InteractiveMap;
