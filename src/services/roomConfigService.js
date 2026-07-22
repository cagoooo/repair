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

function buildReviewItems({ updated, added, preserved, mergedRooms }) {
  const items = new Map();
  const addReason = (code, reason, room, before = null) => {
    const current = items.get(code) || { code, room, before, reasons: [] };
    if (!current.reasons.includes(reason)) current.reasons.push(reason);
    items.set(code, current);
  };

  updated.forEach(change => {
    if (getRoomDisplayName(change.before) !== getRoomDisplayName(change.after)) {
      addReason(change.code, 'name_changed', change.after, change.before);
    }
  });
  added.forEach(room => addReason(room.code, 'new_room', room));
  preserved.forEach(room => addReason(room.code, 'not_detected', room, room));
  mergedRooms.forEach(room => {
    if (!getRoomDisplayName(room)) addReason(room.code, 'missing_name', room);
    if (Number.isFinite(room.confidence) && room.confidence < 0.8) {
      addReason(room.code, 'low_confidence', room);
    }
  });

  return [...items.values()];
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
  const reviewItems = buildReviewItems({ updated, added, preserved, mergedRooms });

  return {
    mergedRooms,
    updated,
    unchanged,
    added,
    preserved,
    duplicateDetectedCodes: [...new Set(duplicateDetectedCodes)],
    reviewItems,
    validation,
    canApply: validation.valid && duplicateDetectedCodes.length === 0
  };
}

export function applyReviewDecisions(mergeResult, decisions = {}) {
  const unresolved = (mergeResult?.reviewItems || []).filter(item => !decisions[item.code]);
  if (unresolved.length > 0) {
    throw new Error(`尚有 ${unresolved.length} 間疑慮教室未確認`);
  }

  const reviewByCode = new Map((mergeResult.reviewItems || []).map(item => [item.code, item]));
  const rooms = (mergeResult.mergedRooms || []).flatMap(room => {
    const item = reviewByCode.get(room.code);
    if (!item) return [room];
    const decision = decisions[room.code];
    if (decision === 'hide') return [];
    if (decision === 'keep' && item.before) {
      return [{ ...item.before, reviewStatus: 'kept', reviewReasons: item.reasons }];
    }
    return [{ ...room, reviewStatus: 'confirmed', reviewReasons: item.reasons }];
  });

  return { rooms, unresolved: [] };
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
