
import { useState, useRef, useCallback, useEffect } from 'react';
import { SHIMEN_ELEMENTARY_TEMPLATE, SHIMEN_KINDERGARTEN_TEMPLATE, AVAILABLE_TEMPLATES } from '../data/roomTemplates';
import './MapEditor.css';

/**
 * 地圖編輯器元件
 * 允許使用者在上傳的教室配置圖上框選教室區域
 * 支援自動辨識功能一鍵載入預設模板
 */
const MapEditor = ({ imageUrl, rooms = [], onSave, onClose, onRoomsChange }) => {
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState(null);
    const [currentRect, setCurrentRect] = useState(null);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [editingRoom, setEditingRoom] = useState(null);
    const [isAutoDetecting, setIsAutoDetecting] = useState(false);
    const [showAutoDetectSuccess, setShowAutoDetectSuccess] = useState(false);
    const [showTemplateMenu, setShowTemplateMenu] = useState(false);

    // 校正模式狀態
    const [showCalibration, setShowCalibration] = useState(false);
    const [transform, setTransform] = useState({ x: 0, y: 0, scaleX: 1, scaleY: 1 });
    const [calibrationStep, setCalibrationStep] = useState(0); // 0: 無, 1: 點擊第一點, 2: 點擊第二點
    const [calibrationClicks, setCalibrationClicks] = useState([]);
    const [isFitScreen, setIsFitScreen] = useState(true); // 縮放模式：預設為適應螢幕

    // Calibration Panel State
    const [panelPosition, setPanelPosition] = useState(null); // {x, y} or null (default CSS)
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
    const dragStartRef = useRef(null); // stores {type, startX, startY, ...}
    const [isDraggingRoom, setIsDraggingRoom] = useState(false);
    const [draggedRoomDelta, setDraggedRoomDelta] = useState(null); // { dx, dy } (Applied to all selected)

    // Multi-Selection State
    const [activeTool, setActiveTool] = useState('select'); // 'select' | 'draw'
    const [selectedRoomIds, setSelectedRoomIds] = useState(new Set());
    const [selectionBox, setSelectionBox] = useState(null); // { x, y, width, height } in %
    const [showBatchHint, setShowBatchHint] = useState(false);

    // Group Resizing State
    // Group Resizing State
    const resizeStateRef = useRef(null); // { handle, startBox, startRooms }
    const [currentResizeBox, setCurrentResizeBox] = useState(null); // Current bounds of the transform box

    // Create a ref for rooms to avoid stale closures in event listeners
    const roomsRef = useRef(rooms);
    useEffect(() => {
        roomsRef.current = rooms;
    }, [rooms]);

    const containerRef = useRef(null);
    const imageRef = useRef(null);

    // 取得相對於圖片的座標
    const getRelativePosition = useCallback((e) => {
        if (!imageRef.current) return { x: 0, y: 0 };

        const rect = imageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    }, []);

    // 計算並應用兩點校正
    const applySmartCalibration = (clicks) => {
        if (clicks.length !== 3 || rooms.length < 2) return;

        // 1. Top-Left Reference (Anchor)
        const ref1 = rooms.find(r => r.code === 'W301') || rooms[0];

        // 2. Far-Right Reference (For Scale X)
        const ref2 = rooms.find(r => r.code === 'C310') ||
            rooms.reduce((max, r) => r.bounds.x > max.bounds.x ? r : max, rooms[0]);

        // 3. Bottom Reference (For Scale Y)
        const ref3 = rooms.find(r => r.code === 'C127') ||
            rooms.find(r => r.code === 'W104') ||
            rooms.reduce((max, r) => r.bounds.y > max.bounds.y ? r : max, rooms[0]);

        // Template Centers
        const t1 = { x: ref1.bounds.x + ref1.bounds.width / 2, y: ref1.bounds.y + ref1.bounds.height / 2 };
        const t2 = { x: ref2.bounds.x + ref2.bounds.width / 2, y: ref2.bounds.y + ref2.bounds.height / 2 };
        const t3 = { x: ref3.bounds.x + ref3.bounds.width / 2, y: ref3.bounds.y + ref3.bounds.height / 2 };

        // User Clicks
        const c1 = clicks[0];
        const c2 = clicks[1];
        const c3 = clicks[2];

        // Scale X
        const templateDiffX = t2.x - t1.x;
        const clickDiffX = c2.x - c1.x;
        const scaleX = Math.abs(templateDiffX) > 1 ? clickDiffX / templateDiffX : 1;

        // Scale Y
        const templateDiffY = t3.y - t1.y;
        const clickDiffY = c3.y - c1.y;
        const scaleY = Math.abs(templateDiffY) > 1 ? clickDiffY / templateDiffY : 1;

        // Translation
        const transX = c1.x - t1.x * scaleX;
        const transY = c1.y - t1.y * scaleY;

        // Apply transformation directly to rooms
        const newRooms = rooms.map(room => ({
            ...room,
            bounds: {
                x: room.bounds.x * Math.abs(scaleX) + transX,
                y: room.bounds.y * Math.abs(scaleY) + transY,
                width: room.bounds.width * Math.abs(scaleX),
                height: room.bounds.height * Math.abs(scaleY)
            }
        }));

        onRoomsChange(newRooms);
        setTransform({ x: 0, y: 0, scaleX: 1, scaleY: 1 });
        setCalibrationStep(0);
        setCalibrationClicks([]);
        setShowCalibration(false);

        // Auto-select all rooms for batch editing
        setTimeout(() => {
            setSelectedRoomIds(new Set(newRooms.map(r => r.id)));
            setShowBatchHint(true);
            setTimeout(() => setShowBatchHint(false), 5000);
        }, 100);
    };

    // 鍵盤微調監聽
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!showCalibration) return;
            if (e.target.tagName === 'INPUT') return;

            const moveStep = e.shiftKey ? 1 : 0.1;
            const scaleStep = e.shiftKey ? 0.05 : 0.005;

            if (e.ctrlKey) {
                e.preventDefault();
                if (e.key === 'ArrowRight') setTransform(t => ({ ...t, scaleX: t.scaleX + scaleStep }));
                if (e.key === 'ArrowLeft') setTransform(t => ({ ...t, scaleX: Math.max(0.1, t.scaleX - scaleStep) }));
                if (e.key === 'ArrowDown') setTransform(t => ({ ...t, scaleY: t.scaleY + scaleStep }));
                if (e.key === 'ArrowUp') setTransform(t => ({ ...t, scaleY: Math.max(0.1, t.scaleY - scaleStep) }));
            }
            else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                if (e.key === 'ArrowRight') setTransform(t => ({ ...t, x: t.x + moveStep }));
                if (e.key === 'ArrowLeft') setTransform(t => ({ ...t, x: t.x - moveStep }));
                if (e.key === 'ArrowDown') setTransform(t => ({ ...t, y: t.y + moveStep }));
                if (e.key === 'ArrowUp') setTransform(t => ({ ...t, y: t.y - moveStep }));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showCalibration]);

    const startSmartCalibration = () => {
        setCalibrationStep(1);
        setCalibrationClicks([]);
    };

    const handleAutoDetect = async (template = SHIMEN_ELEMENTARY_TEMPLATE) => {
        setShowTemplateMenu(false);
        setIsAutoDetecting(true);
        await new Promise(resolve => setTimeout(resolve, 1500));

        const templateRooms = template.rooms.map(room => ({
            ...room,
            id: `${room.id}_${Date.now()}`
        }));

        onRoomsChange(templateRooms);
        setIsAutoDetecting(false);
        setShowAutoDetectSuccess(true);
        setShowCalibration(true);
        setCalibrationStep(1); // Auto-start 3-point calibration
        setCalibrationClicks([]);
        setTimeout(() => setShowAutoDetectSuccess(false), 3000);
    };

    const applyCalibration = () => {
        const newRooms = rooms.map(room => ({
            ...room,
            bounds: {
                x: room.bounds.x * transform.scaleX + transform.x,
                y: room.bounds.y * transform.scaleY + transform.y,
                width: room.bounds.width * transform.scaleX,
                height: room.bounds.height * transform.scaleY
            }
        }));
        onRoomsChange(newRooms);
        setTransform({ x: 0, y: 0, scaleX: 1, scaleY: 1 });
        setShowCalibration(false);
    };

    const resetCalibration = () => {
        setTransform({ x: 0, y: 0, scaleX: 1, scaleY: 1 });
    };

    const handleClearAll = () => {
        if (rooms.length > 0 && confirm(`確定要清除所有 ${rooms.length} 個教室嗎？`)) {
            onRoomsChange([]);
            setSelectedRoom(null);
        }
    };

    // Canvas Event Handlers
    const handleMouseDown = (e) => {
        if (calibrationStep > 0) {
            e.preventDefault();
            const pos = getRelativePosition(e);

            if (calibrationStep === 1) {
                setCalibrationClicks([pos]);
                const refRoom1 = rooms.find(r => r.code === 'W301') || rooms[0];
                const t1 = {
                    x: refRoom1.bounds.x + refRoom1.bounds.width / 2,
                    y: refRoom1.bounds.y + refRoom1.bounds.height / 2
                };
                setTransform(prev => ({
                    ...prev,
                    x: pos.x - t1.x * prev.scaleX,
                    y: pos.y - t1.y * prev.scaleY
                }));
                setCalibrationStep(2);
            } else if (calibrationStep === 2) {
                setCalibrationClicks([...calibrationClicks, pos]);
                setCalibrationStep(3);
            } else if (calibrationStep === 3) {
                const clicks = [...calibrationClicks, pos];
                applySmartCalibration(clicks);
            }
            return;
        }

        if (showCalibration) return;
        // Allow drag on image or container/wrapper (but children like rooms call stopPropagation)
        if (e.target.closest('.room-marker') || e.target.closest('.resize-handle') || e.target.closest('.transform-box')) return;

        const pos = getRelativePosition(e);
        setStartPos(pos);

        if (activeTool === 'draw') {
            setIsDrawing(true);
            setCurrentRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
            setSelectedRoom(null);
            setSelectedRoomIds(new Set());
        } else {
            // Select Tool
            setSelectionBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
            if (!e.shiftKey && !e.ctrlKey) {
                setSelectedRoomIds(new Set());
                setSelectedRoom(null);
            }
        }
    };

    const handleMouseMove = (e) => {
        if (!startPos) return;

        const pos = getRelativePosition(e);
        const x = Math.min(startPos.x, pos.x);
        const y = Math.min(startPos.y, pos.y);
        const width = Math.abs(pos.x - startPos.x);
        const height = Math.abs(pos.y - startPos.y);

        if (activeTool === 'draw') {
            if (!isDrawing) return;
            setCurrentRect({ x, y, width, height });
        } else {
            setSelectionBox({ x, y, width, height });
        }
    };

    const handleMouseUp = (e) => {
        if (!startPos) return;

        if (activeTool === 'draw') {
            if (isDrawing && currentRect) {
                if (currentRect.width > 2 && currentRect.height > 2) {
                    setEditingRoom({
                        id: `room_${Date.now()}`,
                        name: '',
                        code: '',
                        bounds: currentRect,
                        category: 'classroom'
                    });
                }
            }
            setIsDrawing(false);
            setCurrentRect(null);
        } else {
            // Finish Marquee Selection
            if (selectionBox) {
                const sb = selectionBox;
                if (sb.width > 0.5 || sb.height > 0.5) {
                    const newSelected = new Set(e.shiftKey || e.ctrlKey ? selectedRoomIds : []);
                    rooms.forEach(r => {
                        if (r.bounds.x < sb.x + sb.width &&
                            r.bounds.x + r.bounds.width > sb.x &&
                            r.bounds.y < sb.y + sb.height &&
                            r.bounds.y + r.bounds.height > sb.y) {
                            newSelected.add(r.id);
                        }
                    });
                    setSelectedRoomIds(newSelected);
                }
            }
            setSelectionBox(null);
        }

        setStartPos(null);
    };

    const handleSaveRoom = () => {
        if (!editingRoom || !editingRoom.name) return;
        const updatedRooms = [...rooms, editingRoom];
        onRoomsChange(updatedRooms);
        setEditingRoom(null);
    };

    const handleDeleteRoom = (roomId) => {
        const updatedRooms = rooms.filter(r => r.id !== roomId);
        onRoomsChange(updatedRooms);
        setSelectedRoom(null);
    };

    const getCategoryColor = (category) => {
        switch (category) {
            case 'classroom': return 'rgba(59, 130, 246, 0.75)';
            case 'office': return 'rgba(139, 92, 246, 0.75)';
            case 'special': return 'rgba(16, 185, 129, 0.75)';
            case 'utility': return 'rgba(107, 114, 128, 0.75)';
            default: return 'rgba(245, 158, 11, 0.75)';
        }
    };

    const handlePanelDragStart = (e) => {
        if (e.target.closest('.panel-controls')) return;
        e.preventDefault();
        const panel = e.currentTarget.closest('.calibration-panel');
        const rect = panel.getBoundingClientRect();
        dragStartRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialPanelX: rect.left,
            initialPanelY: rect.top
        };
        document.addEventListener('mousemove', handlePanelDragMove);
        document.addEventListener('mouseup', handlePanelDragEnd);
    };

    const handlePanelDragMove = useCallback((e) => {
        if (!dragStartRef.current) return;
        const { startX, startY, initialPanelX, initialPanelY } = dragStartRef.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        setPanelPosition({ x: initialPanelX + dx, y: initialPanelY + dy });
    }, []);

    const handlePanelDragEnd = useCallback(() => {
        if (dragStartRef.current && !dragStartRef.current.type) { // Only if panel drag
            dragStartRef.current = null;
        }
        document.removeEventListener('mousemove', handlePanelDragMove);
        document.removeEventListener('mouseup', handlePanelDragEnd);
    }, [handlePanelDragMove]);

    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handlePanelDragMove);
            document.removeEventListener('mouseup', handlePanelDragEnd);
        };
    }, [handlePanelDragMove, handlePanelDragEnd]);


    // Room Dragging Logic
    const selectedRoomIdsRef = useRef(selectedRoomIds);
    useEffect(() => {
        selectedRoomIdsRef.current = selectedRoomIds;
    }, [selectedRoomIds]);

    const handleRoomMouseDown = (e, room) => {
        if (showCalibration) return;
        if (activeTool === 'draw') return;

        e.stopPropagation();
        e.preventDefault();

        // Selection Logic
        let newSelection = new Set(selectedRoomIds);
        if (e.shiftKey || e.ctrlKey) {
            if (newSelection.has(room.id)) {
                newSelection.delete(room.id);
            } else {
                newSelection.add(room.id);
            }
            setSelectedRoomIds(newSelection);
        } else {
            if (!newSelection.has(room.id)) {
                newSelection = new Set([room.id]);
                setSelectedRoomIds(newSelection);
            }
        }

        // 如果只是按下，先隱藏編輯面板，避免拖曳時出現
        // 等到 MouseUp (handleRoomDragEnd) 判斷這是一次「點擊」而非「拖曳」時才顯示
        setSelectedRoom(null);

        setIsDraggingRoom(true);

        const pos = getRelativePosition(e);
        dragStartRef.current = {
            type: 'room',
            roomId: room.id,
            startX: pos.x,
            startY: pos.y,
            originalX: room.bounds.x,
            originalY: room.bounds.y
        };

        setDraggedRoomDelta({ dx: 0, dy: 0 });

        document.addEventListener('mousemove', handleRoomDragMove);
        document.addEventListener('mouseup', handleRoomDragEnd);
    };

    const handleGroupDragStart = (e) => {
        if (showCalibration || resizeStateRef.current) return;
        e.stopPropagation();
        e.preventDefault();

        setIsDraggingRoom(true);
        const pos = getRelativePosition(e);

        dragStartRef.current = {
            type: 'group',
            startX: pos.x,
            startY: pos.y
        };

        setDraggedRoomDelta({ dx: 0, dy: 0 });

        document.addEventListener('mousemove', handleRoomDragMove);
        document.addEventListener('mouseup', handleRoomDragEnd);
    };

    const handleRoomDragMove = useCallback((e) => {
        if (!dragStartRef.current || (dragStartRef.current.type !== 'room' && dragStartRef.current.type !== 'group')) return;

        const pos = getRelativePosition(e);
        const { startX, startY } = dragStartRef.current;

        const dx = pos.x - startX;
        const dy = pos.y - startY;

        setDraggedRoomDelta({ dx, dy });
    }, [getRelativePosition]);

    const handleRoomDragEnd = useCallback((e) => {
        const dragType = dragStartRef.current?.type;
        if (dragType === 'room' || dragType === 'group') {
            setIsDraggingRoom(false);

            const { startX, startY } = dragStartRef.current;
            const pos = getRelativePosition(e);

            // If dragging group, check if it was just a click
            const isClick = Math.abs(pos.x - startX) < 0.5 && Math.abs(pos.y - startY) < 0.5;

            if (isClick) {
                if (dragType === 'group') {
                    // Group click: currently does nothing special
                } else if (dragType === 'room') {
                    // Room click: Show edit panel if it's a single selection
                    const roomId = dragStartRef.current.roomId;
                    if (selectedRoomIdsRef.current.size === 1 && selectedRoomIdsRef.current.has(roomId)) {
                        const room = roomsRef.current.find(r => r.id === roomId);
                        if (room) setSelectedRoom(room);
                    }
                }
            } else {
                const dx = pos.x - startX;
                const dy = pos.y - startY;

                const updatedRooms = roomsRef.current.map(r => {
                    if (selectedRoomIdsRef.current.has(r.id)) {
                        return {
                            ...r,
                            bounds: {
                                ...r.bounds,
                                x: r.bounds.x + dx,
                                y: r.bounds.y + dy
                            }
                        };
                    }
                    return r;
                });

                onRoomsChange(updatedRooms);
            }
            setDraggedRoomDelta(null);
        }

        if (dragStartRef.current?.type === 'room' || dragStartRef.current?.type === 'group') {
            dragStartRef.current = null;
        }

        document.removeEventListener('mousemove', handleRoomDragMove);
        document.removeEventListener('mouseup', handleRoomDragEnd);
    }, [getRelativePosition, onRoomsChange, handleRoomDragMove]);

    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleRoomDragMove);
            document.removeEventListener('mouseup', handleRoomDragEnd);
            if (handleResizeMove) document.removeEventListener('mousemove', handleResizeMove);
            if (handleResizeEnd) document.removeEventListener('mouseup', handleResizeEnd);
        };
    }, [handleRoomDragMove, handleRoomDragEnd]);

    // --- Group Resizing Logic ---

    // Calculate bounding box of selected rooms
    const getSelectionBounds = useCallback(() => {
        if (selectedRoomIds.size === 0) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        rooms.forEach(r => {
            if (selectedRoomIds.has(r.id)) {
                minX = Math.min(minX, r.bounds.x);
                minY = Math.min(minY, r.bounds.y);
                maxX = Math.max(maxX, r.bounds.x + r.bounds.width);
                maxY = Math.max(maxY, r.bounds.y + r.bounds.height);
            }
        });

        if (minX === Infinity) return null;
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }, [rooms, selectedRoomIds]);

    const handleResizeStart = (e, handle) => {
        e.stopPropagation(); // Prevent map drag or room selection
        const bounds = getSelectionBounds();
        if (!bounds) return;

        const startRooms = rooms.filter(r => selectedRoomIds.has(r.id)).map(r => ({ ...r }));

        resizeStateRef.current = {
            handle,
            startBox: bounds,
            startRooms,
            startX: e.clientX,
            startY: e.clientY
        };
        setCurrentResizeBox(bounds);

        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
    };

    const handleResizeMove = useCallback((e) => {
        if (!resizeStateRef.current) return;
        const { handle, startBox, startX, startY } = resizeStateRef.current;

        // Convert mouse delta to % delta (approx)
        if (!imageRef.current) return;
        const rect = imageRef.current.getBoundingClientRect();
        const deltaX = ((e.clientX - startX) / rect.width) * 100;
        const deltaY = ((e.clientY - startY) / rect.height) * 100;

        const newBox = { ...startBox };

        // Apply delta based on handle
        if (handle.includes('e')) newBox.width = Math.max(0.5, startBox.width + deltaX);
        if (handle.includes('w')) {
            newBox.x = startBox.x + deltaX;
            newBox.width = Math.max(0.5, startBox.width - deltaX);
        }
        if (handle.includes('s')) newBox.height = Math.max(0.5, startBox.height + deltaY);
        if (handle.includes('n')) {
            newBox.y = startBox.y + deltaY;
            newBox.height = Math.max(0.5, startBox.height - deltaY);
        }

        setCurrentResizeBox(newBox);
    }, []); // Removed onRoomsChange from dependencies as it's no longer called here

    const handleResizeEnd = useCallback((e) => {
        if (!resizeStateRef.current) return;

        const { handle, startBox, startRooms, startX, startY } = resizeStateRef.current;

        // Recalculate final box to ensure we use the latest position
        if (!imageRef.current) return;
        const rect = imageRef.current.getBoundingClientRect();
        const deltaX = ((e.clientX - startX) / rect.width) * 100;
        const deltaY = ((e.clientY - startY) / rect.height) * 100;

        const newBox = { ...startBox };
        if (handle.includes('e')) newBox.width = Math.max(0.5, startBox.width + deltaX);
        if (handle.includes('w')) {
            newBox.x = startBox.x + deltaX;
            newBox.width = Math.max(0.5, startBox.width - deltaX);
        }
        if (handle.includes('s')) newBox.height = Math.max(0.5, startBox.height + deltaY);
        if (handle.includes('n')) {
            newBox.y = startBox.y + deltaY;
            newBox.height = Math.max(0.5, startBox.height - deltaY);
        }

        const updatedRooms = roomsRef.current.map(r => {
            if (!selectedRoomIdsRef.current.has(r.id)) return r;

            const original = startRooms.find(sr => sr.id === r.id) || r;

            const ratioW = startBox.width > 0 ? (newBox.width / startBox.width) : 1;
            const ratioH = startBox.height > 0 ? (newBox.height / startBox.height) : 1;

            const newX = newBox.x + (original.bounds.x - startBox.x) * ratioW;
            const newY = newBox.y + (original.bounds.y - startBox.y) * ratioH;
            const newW = original.bounds.width * ratioW;
            const newH = original.bounds.height * ratioH;

            return {
                ...r,
                bounds: {
                    x: Math.round(newX * 100) / 100,
                    y: Math.round(newY * 100) / 100,
                    width: Math.round(newW * 100) / 100,
                    height: Math.round(newH * 100) / 100
                }
            };
        });

        onRoomsChange(updatedRooms);

        resizeStateRef.current = null;
        setCurrentResizeBox(null);
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
    }, [onRoomsChange, handleResizeMove]);

    // Memoized selection bounds for rendering
    const selectionBounds = currentResizeBox || (selectedRoomIds.size > 0 ? getSelectionBounds() : null);

    const handleResetCalibration = () => {
        resetCalibration();
        setPanelPosition(null);
    };

    return (
        <div className="map-editor-overlay">
            <div className="map-editor-container" style={{
                maxWidth: isFitScreen ? '98vw' : '100%',
                maxHeight: '95vh',
                height: '95vh',

                display: 'flex',
                flexDirection: 'column',
                position: 'relative' // Ensure absolute children are relative to this container
            }}>
                <div className="map-editor-header">
                    <div className="header-left">
                        <h2>🗺️ 地圖編輯器</h2>
                        <p className="map-editor-hint">
                            {showCalibration ? (
                                calibrationStep > 0 ? (
                                    <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>
                                        {(() => {
                                            if (calibrationStep === 1) {
                                                const r = rooms.find(r => r.code === 'W301') || rooms[0];
                                                return `🎯 步驟 1/3: 請點擊【${r?.name} (${r?.code})】(左上角)`;
                                            } else if (calibrationStep === 2) {
                                                const r = rooms.find(r => r.code === 'C310') ||
                                                    rooms.reduce((max, curr) => curr.bounds.x > max.bounds.x ? curr : max, rooms[0]);
                                                return `🎯 步驟 2/3: 請點擊【${r?.name} (${r?.code})】(最右側)`;
                                            } else {
                                                const r = rooms.find(r => r.code === 'C127') ||
                                                    rooms.find(r => r.code === 'W104') ||
                                                    rooms.reduce((max, curr) => curr.bounds.y > max.bounds.y ? curr : max, rooms[0]);
                                                return `🎯 步驟 3/3: 請點擊【${r?.name} (${r?.code})】(左下/最下方)`;
                                            }
                                        })()}
                                    </span>
                                ) : '🔧 校正模式：請拖曳滑桿微調，或點擊「兩點定位」重新校正'
                            ) : '在圖片上拖曳滑鼠框選教室區域，或使用自動辨識功能'}
                        </p>
                    </div>
                    <div className="header-actions">
                        {!showCalibration && (
                            <>
                                <div className="tool-switcher" style={{ display: 'flex', gap: '8px', marginRight: '16px', background: 'rgba(255,255,255,0.1)', padding: '4px', borderRadius: '8px' }}>
                                    <button
                                        className={`btn-icon ${activeTool === 'select' ? 'active' : ''}`}
                                        onClick={() => setActiveTool('select')}
                                        title="選取工具"
                                        style={{ background: activeTool === 'select' ? '#3b82f6' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '6px' }}
                                    >
                                        🖱️
                                    </button>
                                    <button
                                        className={`btn-icon ${activeTool === 'draw' ? 'active' : ''}`}
                                        onClick={() => setActiveTool('draw')}
                                        title="繪製工具"
                                        style={{ background: activeTool === 'draw' ? '#3b82f6' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '6px' }}
                                    >
                                        ✏️
                                    </button>
                                </div>

                                <div className="dropdown-container">
                                    <button
                                        className={`btn btn-primary auto-detect-btn ${isAutoDetecting ? 'loading' : ''}`}
                                        onClick={() => handleAutoDetect(AVAILABLE_TEMPLATES[0])}
                                        disabled={isAutoDetecting}
                                    >
                                        {isAutoDetecting ? (
                                            <>
                                                <span className="spinner"></span>
                                                辨識中...
                                            </>
                                        ) : (
                                            <>🤖 自動辨識教室</>
                                        )}
                                    </button>
                                </div>
                                {rooms.length > 0 && (
                                    <button className="btn btn-secondary" onClick={() => setShowCalibration(true)}>
                                        📐 校正位置
                                    </button>
                                )}
                                {rooms.length > 0 && onSave && (
                                    <button className="btn btn-primary" onClick={() => onSave(rooms)}>
                                        💾 儲存設定
                                    </button>
                                )}
                                {rooms.length > 0 && (
                                    <button className="btn btn-danger" onClick={handleClearAll}>
                                        🗑️ 清除全部
                                    </button>
                                )}
                            </>
                        )}
                        {showCalibration && (
                            <div className="calibration-actions">
                                <button className="btn btn-primary" onClick={applyCalibration}>✅ 套用校正</button>
                                <button className="btn btn-secondary" onClick={() => {
                                    resetCalibration();
                                    setShowCalibration(false);
                                }}>取消</button>
                            </div>
                        )}
                        {!showCalibration && (
                            <>
                                <button
                                    className={`btn btn-secondary ${isFitScreen ? 'btn-active' : ''}`}
                                    onClick={() => setIsFitScreen(!isFitScreen)}
                                >
                                    {isFitScreen ? '🔍 原始大小' : '📏 適應螢幕'}
                                </button>
                                <button className="btn btn-secondary" onClick={onClose}>
                                    ✕ 關閉
                                </button>
                            </>
                        )}
                    </div>
                </div>


                {showCalibration && (
                    <div
                        className="calibration-panel glass-card animate-fadeIn"
                        style={panelPosition ?
                            { top: panelPosition.y, left: panelPosition.x, right: 'auto', position: 'fixed' } :
                            { top: '80px', right: '20px', left: 'auto', position: 'absolute' }
                        }
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div
                            className="panel-header"
                            onMouseDown={handlePanelDragStart}
                            style={{
                                cursor: 'move',
                                paddingBottom: '8px',
                                marginBottom: '8px',
                                borderBottom: '1px solid var(--border-color)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <h4 style={{ margin: 0, fontSize: '0.9rem' }}>🔧 校正控制</h4>
                            <button
                                className="btn-icon"
                                onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
                            >
                                {isPanelCollapsed ? '🔽' : '🔼'}
                            </button>
                        </div>
                        {!isPanelCollapsed && (
                            <>
                                <div className="calibration-controls panel-controls">
                                    <div className="control-group">
                                        <label>↔️ 水平位移 (X): {Math.round(transform.x)}%</label>
                                        <input
                                            type="range" min="-50" max="50" step="0.5"
                                            value={transform.x}
                                            onChange={(e) => setTransform({ ...transform, x: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="control-group">
                                        <label>↕️ 垂直位移 (Y): {Math.round(transform.y)}%</label>
                                        <input
                                            type="range" min="-50" max="50" step="0.5"
                                            value={transform.y}
                                            onChange={(e) => setTransform({ ...transform, y: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="control-group">
                                        <label>↔️ 水平縮放 (W): {transform.scaleX.toFixed(2)}x</label>
                                        <input
                                            type="range" min="0.5" max="3" step="0.05"
                                            value={transform.scaleX}
                                            onChange={(e) => setTransform({ ...transform, scaleX: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="control-group">
                                        <label>↕️ 垂直縮放 (H): {transform.scaleY.toFixed(2)}x</label>
                                        <input
                                            type="range" min="0.5" max="3" step="0.05"
                                            value={transform.scaleY}
                                            onChange={(e) => setTransform({ ...transform, scaleY: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="calibration-actions-row panel-controls" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                                    <button className="btn-sm primary" onClick={startSmartCalibration}>✨ 兩點定位</button>
                                    <button className="btn-sm" onClick={handleResetCalibration}>重置</button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div className="map-scroll-container" style={{
                    flex: 1,
                    overflow: 'auto',
                    position: 'relative',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: '#1e1e1e',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: isFitScreen ? 'center' : 'flex-start'
                }}>
                    <div className="map-content-wrapper"
                        ref={containerRef}
                        style={{
                            position: 'relative',
                            width: 'fit-content',
                            height: 'fit-content'
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        {showAutoDetectSuccess && (
                            <div className="auto-detect-success animate-fadeIn">
                                <span>🎉</span>
                                <div>
                                    <p style={{ margin: 0, fontWeight: 'bold' }}>已載入預設模板</p>
                                    <p style={{ margin: 0, fontSize: '0.9em' }}>請依照上方提示進行三點定位！</p>
                                </div>
                            </div>
                        )}

                        {showBatchHint && (
                            <div className="auto-detect-success animate-fadeIn" style={{ top: '20%', left: '50%', transform: 'translate(-50%, -50%)', maxWidth: '400px', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                <span style={{ fontSize: '2rem' }}>✨ 校正完成！</span>
                                <p>現在您可以直接：</p>
                                <ul style={{ textAlign: 'left', margin: '10px 0', paddingLeft: '20px' }}>
                                    <li>拖曳 <b>藍色框框</b> 移動整組教室</li>
                                    <li>拖曳 <b>白色圓點</b> 調整大小比例</li>
                                </ul>
                                <button className="btn btn-sm btn-light" onClick={() => setShowBatchHint(false)}>知道了</button>
                            </div>
                        )}



                        <img
                            ref={imageRef}
                            src={imageUrl}
                            alt="教室配置圖"
                            className="map-editor-image"
                            style={{
                                display: 'block',
                                maxWidth: isFitScreen ? '100%' : 'none',
                                maxHeight: isFitScreen ? 'calc(90vh - 100px)' : 'none',
                                width: 'auto',
                                height: 'auto',
                                userSelect: 'none'
                            }}
                            draggable={false}
                        />

                        {isAutoDetecting && (
                            <div className="detecting-overlay">
                                <div className="detecting-scanner"></div>
                                <div className="detecting-text">
                                    <span className="detecting-icon">🔍</span>
                                    <p>正在分析教室配置圖...</p>
                                    <p className="detecting-hint">辨識教室區塊與文字中</p>
                                </div>
                            </div>
                        )}

                        {rooms.map((room) => {
                            let renderBounds = room.bounds;
                            if (showCalibration) {
                                renderBounds = {
                                    x: room.bounds.x * transform.scaleX + transform.x,
                                    y: room.bounds.y * transform.scaleY + transform.y,
                                    width: room.bounds.width * transform.scaleX,
                                    height: room.bounds.height * transform.scaleY
                                };
                            }
                            else if (draggedRoomDelta && selectedRoomIds.has(room.id)) {
                                renderBounds = {
                                    ...room.bounds,
                                    x: room.bounds.x + draggedRoomDelta.dx,
                                    y: room.bounds.y + draggedRoomDelta.dy
                                };
                            }
                            else if (resizeStateRef.current && currentResizeBox && selectedRoomIds.has(room.id)) {
                                const { startBox, startRooms } = resizeStateRef.current;
                                const original = startRooms.find(sr => sr.id === room.id) || room;

                                const ratioW = startBox.width > 0 ? (currentResizeBox.width / startBox.width) : 1;
                                const ratioH = startBox.height > 0 ? (currentResizeBox.height / startBox.height) : 1;

                                renderBounds = {
                                    x: currentResizeBox.x + (original.bounds.x - startBox.x) * ratioW,
                                    y: currentResizeBox.y + (original.bounds.y - startBox.y) * ratioH,
                                    width: original.bounds.width * ratioW,
                                    height: original.bounds.height * ratioH
                                };
                            }

                            const isSelected = selectedRoomIds.has(room.id);

                            return (
                                <div
                                    key={`${room.id}_${showCalibration ? 'c' : 'n'}`}
                                    className={`room-marker ${isSelected ? 'selected' : ''} ${showCalibration ? 'calibrating' : ''}`}
                                    style={{
                                        left: `${renderBounds.x}%`,
                                        top: `${renderBounds.y}%`,
                                        width: `${renderBounds.width}%`,
                                        height: `${renderBounds.height}%`,
                                        background: getCategoryColor(room.category),
                                        border: isSelected ? '2px solid #ef4444' : (showCalibration ? '1px dashed yellow' : '1px solid rgba(255,255,255,0.3)'),
                                        zIndex: isSelected ? 10 : 1
                                    }}
                                    onMouseDown={(e) => handleRoomMouseDown(e, room)}
                                >
                                    <div className="room-label-container">
                                        <span className="room-label code">{room.code}</span>
                                        {room.name && room.name !== room.code && (
                                            <span className="room-label name">{room.name}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {selectionBox && (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: `${selectionBox.x}%`,
                                    top: `${selectionBox.y}%`,
                                    width: `${selectionBox.width}%`,
                                    height: `${selectionBox.height}%`,
                                    border: '1px dashed #3b82f6',
                                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                    pointerEvents: 'none',
                                    zIndex: 100
                                }}
                            />
                        )}

                        {/* Transform Box for Selection Group */}
                        {selectionBounds && !selectionBox && (
                            <div
                                className="transform-box"
                                style={{
                                    left: `${selectionBounds.x + (draggedRoomDelta ? draggedRoomDelta.dx : 0)}%`,
                                    top: `${selectionBounds.y + (draggedRoomDelta ? draggedRoomDelta.dy : 0)}%`,
                                    width: `${selectionBounds.width}%`,
                                    height: `${selectionBounds.height}%`,
                                }}
                                onMouseDown={handleGroupDragStart}
                            >
                                {['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(handle => (
                                    <div
                                        key={handle}
                                        className={`resize-handle handle-${handle}`}
                                        onMouseDown={(e) => handleResizeStart(e, handle)}
                                    />
                                ))}
                            </div>
                        )}

                        {calibrationClicks.map((click, index) => (
                            <div
                                key={index}
                                className="calibration-point"
                                style={{
                                    position: 'absolute',
                                    left: `${click.x}%`,
                                    top: `${click.y}%`,
                                    width: '20px',
                                    height: '20px',
                                    marginLeft: '-10px',
                                    marginTop: '-10px',
                                    background: '#ef4444',
                                    border: '2px solid white',
                                    borderRadius: '50%',
                                    boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '12px',
                                    zIndex: 1000,
                                    pointerEvents: 'none'
                                }}
                            >
                                {index + 1}
                            </div>
                        ))}

                        {currentRect && (
                            <div
                                className="room-marker drawing"
                                style={{
                                    left: `${currentRect.x}%`,
                                    top: `${currentRect.y}%`,
                                    width: `${currentRect.width}%`,
                                    height: `${currentRect.height}%`
                                }}
                            />
                        )}
                    </div>
                </div>

                {editingRoom && !showCalibration && (
                    <div className="room-edit-form glass-card">
                        <h3>📍 新增教室</h3>
                        <div className="form-group">
                            <label className="form-label">教室編號</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="例如：C101"
                                value={editingRoom.code}
                                onChange={(e) => setEditingRoom({ ...editingRoom, code: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">教室名稱</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="例如：一年1班"
                                value={editingRoom.name}
                                onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">類型</label>
                            <select
                                className="form-select"
                                value={editingRoom.category}
                                onChange={(e) => setEditingRoom({ ...editingRoom, category: e.target.value })}
                            >
                                <option value="classroom">普通教室</option>
                                <option value="office">辦公室</option>
                                <option value="special">專科教室</option>
                                <option value="utility">公共設施</option>
                                <option value="other">其他</option>
                            </select>
                        </div>
                        <div className="form-actions">
                            <button className="btn btn-primary" onClick={handleSaveRoom}>
                                ✓ 儲存
                            </button>
                            <button className="btn btn-secondary" onClick={() => setEditingRoom(null)}>
                                取消
                            </button>
                        </div>
                    </div>
                )}

                {selectedRoom && !editingRoom && !showCalibration && !isDraggingRoom && (
                    <div className="room-info-panel glass-card">
                        <h3>📍 {selectedRoom.code} - {selectedRoom.name}</h3>
                        <p className="room-category">類型：{selectedRoom.category}</p>
                        <div className="form-actions">
                            <button
                                className="btn btn-danger"
                                onClick={() => handleDeleteRoom(selectedRoom.id)}
                            >
                                🗑️ 刪除
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setSelectedRoom(null)}
                            >
                                取消選擇
                            </button>
                        </div>
                    </div>
                )}

                <div className="editor-footer">
                    <div className="editor-stats">
                        <span>已設定 <strong>{rooms.length}</strong> 個教室</span>
                    </div>
                    <div className="editor-legend">
                        <span className="legend-item"><span className="legend-dot classroom"></span> 普通教室</span>
                        <span className="legend-item"><span className="legend-dot office"></span> 辦公室</span>
                        <span className="legend-item"><span className="legend-dot special"></span> 專科教室</span>
                        <span className="legend-item"><span className="legend-dot utility"></span> 公共設施</span>
                    </div>
                </div>
            </div>
        </div >
    );
}

export default MapEditor;
