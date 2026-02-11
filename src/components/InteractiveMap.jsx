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
    const containerRef = useRef(null);
    const contentRef = useRef(null);

    // Zoom Handling (Wheel)
    const handleWheel = useCallback((e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const scaleAmount = -e.deltaY * 0.001;
            setTransform(t => ({
                ...t,
                scale: Math.max(0.5, Math.min(4, t.scale + scaleAmount))
            }));
        } else {
            // Pan with wheel if not zooming? 
            // Standard behavior: vertical scroll pans vertical, shift+wheel pans horizontal
            // But let's just allow native scroll if not ctrl?
        }
    }, []);

    // Drag to Pan
    const handleMouseDown = (e) => {
        // Only drag if not clicking a room (handled by room click propagation stop?)
        // e.button === 0 (Left click)
        // If clicking room, we might still want to support drag if they hold and move?
        // But let's simple: background drag = pan.

        if (e.target.closest('.room-interactive')) return;

        setIsDragging(true);
        setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
        e.preventDefault(); // Prevent text selection etc
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

    // Category Colors (Shared with MapEditor logic or CSS?)
    // Using CSS classes based on category is better if available, or inline styles
    const getCategoryColor = (category) => {
        switch (category) {
            case 'classroom': return 'rgba(59, 130, 246, 0.75)';
            case 'office': return 'rgba(139, 92, 246, 0.75)';
            case 'special': return 'rgba(16, 185, 129, 0.75)';
            case 'utility': return 'rgba(107, 114, 128, 0.75)';
            default: return 'rgba(245, 158, 11, 0.75)';
        }
    };

    // Compute room status and repair count
    const getRoomData = (room) => {
        if (!repairs || repairs.length === 0) return { status: 'normal', count: 0 };

        const roomRepairs = repairs.filter(r => {
            if (r.status === 'completed') return false;

            // Prioritize unique code matching if available
            if (r.roomCode && room.code) {
                return r.roomCode === room.code;
            }

            // Fallback for legacy data (name matching)
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
        <div className="interactive-map-container">
            {onEditMap && (
                <button
                    className="map-edit-btn"
                    onClick={onEditMap}
                >
                    ✏️ 編輯地圖
                </button>
            )}
            <div
                className="map-wrapper"
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
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
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

                        return (
                            <div
                                key={room.id}
                                className={`room-interactive status-${status}`}
                                style={{
                                    left: `${room.bounds.x}%`,
                                    top: `${room.bounds.y}%`,
                                    width: `${room.bounds.width}%`,
                                    height: `${room.bounds.height}%`,
                                    backgroundColor: status === 'normal' ? getCategoryColor(room.category) : undefined,
                                    // Let CSS handle background for non-normal statuses
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRoomClick(room);
                                }}
                                title={`${room.name} (${room.code}) - ${count} 件待修`}
                            >
                                <div className="room-label-container">
                                    <span className="room-label code">{room.code}</span>
                                    {room.name && room.name !== room.code && (
                                        <span className="room-label name">{room.name}</span>
                                    )}
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

            <div className="map-legend">
                <div className="legend-item">
                    <span className="legend-dot normal"></span>
                    <span>正常</span>
                </div>
                <div className="legend-item">
                    <span className="legend-dot pending"></span>
                    <span>待維修</span>
                </div>
                <div className="legend-item">
                    <span className="legend-dot urgent"></span>
                    <span>緊急</span>
                </div>
            </div>
        </div>
    );
}

export default InteractiveMap;
