import { normalizeRoomCode, resolveRoom, validateRooms } from './roomConfigService';

export const MAP_SNAPSHOT_SCHEMA_VERSION = 1;

function hashText(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function createMapBackupSnapshot({
  academicYear = '',
  revision = 0,
  mapImage = '',
  source = {},
  rooms = [],
  repairs = [],
  createdBy = ''
} = {}) {
  const roomValidation = validateRooms(rooms);
  if (!roomValidation.valid) {
    throw new Error(`無法建立快照：${roomValidation.errors.join('；')}`);
  }

  const unresolvedRepairIds = repairs
    .filter(repair => !resolveRoom(rooms, repair))
    .map(repair => repair.id || repair.roomCode || repair.roomName || 'unknown');
  const payload = {
    schemaVersion: MAP_SNAPSHOT_SCHEMA_VERSION,
    kind: 'repair-map-pre-publish-backup',
    generatedAt: new Date().toISOString(),
    createdBy,
    academicYear,
    revision: Number(revision || 0),
    mapImage,
    source,
    rooms,
    audit: {
      roomCount: rooms.length,
      uniqueRoomCodeCount: new Set(rooms.map(room => normalizeRoomCode(room.code))).size,
      repairCount: repairs.length,
      unresolvedRepairCount: unresolvedRepairIds.length,
      unresolvedRepairIds
    }
  };
  return { ...payload, checksum: hashText(JSON.stringify(payload)) };
}

export function validateMapBackupSnapshot(snapshot) {
  if (!snapshot || snapshot.kind !== 'repair-map-pre-publish-backup') {
    return { valid: false, errors: ['不是有效的教室配置快照'] };
  }
  const { checksum, ...payload } = snapshot;
  const validation = validateRooms(snapshot.rooms || []);
  const errors = [...validation.errors];
  if (snapshot.schemaVersion !== MAP_SNAPSHOT_SCHEMA_VERSION) errors.push('不支援的快照版本');
  if (!snapshot.mapImage) errors.push('快照缺少地圖圖片');
  if (hashText(JSON.stringify(payload)) !== checksum) errors.push('快照校驗碼不一致');
  return { valid: errors.length === 0, errors };
}

export function downloadJsonFile(data, fileName) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
