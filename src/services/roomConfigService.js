const ROOM_CODE_PATTERN = /^[A-Z][A-Z0-9_-]{1,11}$/;

export function normalizeRoomCode(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function getRoomDisplayName(room) {
  const code = normalizeRoomCode(room?.code);
  const name = String(room?.name || '').trim();
  if (!code || !name.toUpperCase().startsWith(code)) return name;
  return name.slice(code.length).trim();
}

export function resolveRoom(rooms = [], roomReference = {}) {
  if (!roomReference) return null;

  const reference = typeof roomReference === 'string'
    ? { roomId: roomReference }
    : roomReference;
  const code = normalizeRoomCode(reference.roomCode || reference.code);
  const id = reference.roomId || reference.id;
  const name = String(reference.roomName || reference.name || '').trim();

  if (code) {
    const byCode = rooms.find(room => normalizeRoomCode(room.code) === code);
    if (byCode) return byCode;
  }

  if (id) {
    const byId = rooms.find(room => room.id === id);
    if (byId) return byId;
  }

  if (name) {
    return rooms.find(room => room.name === name || getRoomDisplayName(room) === name) || null;
  }

  return null;
}

function hasValidBounds(bounds) {
  if (!bounds) return false;
  return ['x', 'y', 'width', 'height'].every(key => Number.isFinite(Number(bounds[key]))) &&
    Number(bounds.width) > 0 && Number(bounds.height) > 0;
}

export function validateRooms(rooms = []) {
  const errors = [];
  const warnings = [];
  const codeCounts = new Map();
  const idCounts = new Map();

  rooms.forEach((room, index) => {
    const code = normalizeRoomCode(room.code);
    const label = code || `第 ${index + 1} 筆`;

    if (!code) errors.push(`${label}缺少教室編號`);
    else if (!ROOM_CODE_PATTERN.test(code)) errors.push(`${code} 的教室編號格式不正確`);
    else codeCounts.set(code, (codeCounts.get(code) || 0) + 1);

    if (!room.id) errors.push(`${label}缺少穩定 ID`);
    else idCounts.set(room.id, (idCounts.get(room.id) || 0) + 1);

    if (!String(room.name || '').trim()) warnings.push(`${label}缺少教室名稱`);
    if (!hasValidBounds(room.bounds)) errors.push(`${label}缺少有效座標`);
  });

  codeCounts.forEach((count, code) => {
    if (count > 1) errors.push(`教室編號 ${code} 重複 ${count} 次`);
  });
  idCounts.forEach((count, id) => {
    if (count > 1) errors.push(`教室 ID ${id} 重複 ${count} 次`);
  });

  return { valid: errors.length === 0, errors, warnings };
}

function roomChanged(existing, incoming) {
  return getRoomDisplayName(existing) !== getRoomDisplayName(incoming) ||
    existing.category !== incoming.category ||
    JSON.stringify(existing.bounds) !== JSON.stringify(incoming.bounds);
}

export function mergeRoomsByCode(currentRooms = [], detectedRooms = []) {
  const currentByCode = new Map();
  const detectedByCode = new Map();
  const duplicateDetectedCodes = [];

  currentRooms.forEach(room => {
    const code = normalizeRoomCode(room.code);
    if (code && !currentByCode.has(code)) currentByCode.set(code, room);
  });

  detectedRooms.forEach(room => {
    const code = normalizeRoomCode(room.code);
    if (!code) return;
    if (detectedByCode.has(code)) duplicateDetectedCodes.push(code);
    else detectedByCode.set(code, room);
  });

  const mergedRooms = [];
  const updated = [];
  const unchanged = [];
  const added = [];
  const preserved = [];

  detectedByCode.forEach((incoming, code) => {
    const existing = currentByCode.get(code);
    if (existing) {
      const merged = {
        ...existing,
        ...incoming,
        id: existing.id || code,
        code
      };
      mergedRooms.push(merged);
      (roomChanged(existing, merged) ? updated : unchanged).push({
        code,
        before: existing,
        after: merged
      });
      return;
    }

    const newRoom = { ...incoming, id: code, code };
    mergedRooms.push(newRoom);
    added.push(newRoom);
  });

  currentByCode.forEach((existing, code) => {
    if (detectedByCode.has(code)) return;
    mergedRooms.push(existing);
    preserved.push(existing);
  });

  const validation = validateRooms(mergedRooms);

  return {
    mergedRooms,
    updated,
    unchanged,
    added,
    preserved,
    duplicateDetectedCodes: [...new Set(duplicateDetectedCodes)],
    validation,
    canApply: validation.valid && duplicateDetectedCodes.length === 0
  };
}

export function summarizeMapBaseline(rooms = [], repairs = []) {
  const validation = validateRooms(rooms);
  const roomCodes = new Set(rooms.map(room => normalizeRoomCode(room.code)).filter(Boolean));
  const unresolvedRepairs = repairs.filter(repair => !roomCodes.has(normalizeRoomCode(repair.roomCode)));

  return {
    roomCount: rooms.length,
    repairCount: repairs.length,
    unresolvedRepairCount: unresolvedRepairs.length,
    validation
  };
}
