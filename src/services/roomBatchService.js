import { getRoomDisplayName, normalizeRoomCode } from './roomConfigService';

export function selectRoomIds(rooms = [], filter = 'all', query = '') {
  const keyword = String(query).trim().toLowerCase();
  return rooms.filter(room => {
    if (filter === 'low_confidence') return Number.isFinite(room.confidence) && room.confidence < 0.8;
    if (filter === 'review') return (room.reviewReasons || []).length > 0;
    if (filter === 'hidden') return room.hidden === true;
    if (filter === 'search') {
      return normalizeRoomCode(room.code).toLowerCase().includes(keyword) ||
        getRoomDisplayName(room).toLowerCase().includes(keyword);
    }
    return true;
  }).map(room => room.id);
}

export function applyRoomBatchChanges(rooms = [], selectedIds = [], changes = {}) {
  const selected = new Set(selectedIds);
  let affectedCount = 0;
  const updatedRooms = rooms.map(room => {
    if (!selected.has(room.id)) return room;
    let next = { ...room };
    const displayName = getRoomDisplayName(room);
    if (changes.findText) {
      const replaced = displayName.split(changes.findText).join(changes.replaceText || '');
      if (replaced !== displayName) {
        const code = normalizeRoomCode(room.code);
        next.name = String(room.name || '').toUpperCase().startsWith(code)
          ? `${code} ${replaced}`.trim()
          : replaced;
      }
    }
    if (changes.category && changes.category !== 'keep') next.category = changes.category;
    if (changes.visibility === 'show') next.hidden = false;
    if (changes.visibility === 'hide') next.hidden = true;
    if (JSON.stringify(next) !== JSON.stringify(room)) affectedCount += 1;
    return next;
  });
  return { rooms: updatedRooms, affectedCount };
}
