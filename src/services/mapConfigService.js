import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { validateRooms } from './roomConfigService';

export const MAP_CONFIG_SCHEMA_VERSION = 2;

const OMIT_FROM_RESTORE = new Set([
  'id',
  'archiveReason',
  'archivedAt',
  'archivedAtIso',
  'archivedBy',
  'sourceRevision',
  'versionId'
]);

function withoutUndefined(value) {
  if (Array.isArray(value)) return value.map(withoutUndefined);
  if (!value || typeof value !== 'object') return value;
  if (Object.getPrototypeOf(value) !== Object.prototype) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, withoutUndefined(item)])
  );
}

export function createMapConfigPayload({
  rooms,
  mapImage,
  mapImageUrl,
  academicYear = '',
  source = {},
  revision = 1,
  updatedBy = ''
}) {
  const validation = validateRooms(rooms);
  if (!validation.valid) {
    throw new Error(`教室資料驗證失敗：${validation.errors.join('；')}`);
  }

  if (!mapImage && !mapImageUrl) {
    throw new Error('缺少教室配置圖');
  }

  return withoutUndefined({
    schemaVersion: MAP_CONFIG_SCHEMA_VERSION,
    revision,
    academicYear: academicYear.trim(),
    rooms,
    ...(mapImageUrl ? { mapImageUrl } : { mapImage }),
    source,
    updatedAt: serverTimestamp(),
    updatedAtIso: new Date().toISOString(),
    updatedBy
  });
}

export function createMapVersionPayload(currentConfig, {
  versionId,
  archivedBy = '',
  reason = '套用新教室配置前自動備份'
} = {}) {
  return withoutUndefined({
    ...currentConfig,
    versionId,
    sourceRevision: Number(currentConfig?.revision || 0),
    archivedAt: serverTimestamp(),
    archivedAtIso: new Date().toISOString(),
    archivedBy,
    archiveReason: reason
  });
}

export async function saveMapConfigWithBackup(db, nextConfig, {
  actorEmail = '',
  reason
} = {}) {
  if (!db) throw new Error('Firebase 尚未初始化');

  const currentRef = doc(db, 'system', 'mapConfig');
  const versionRef = doc(collection(currentRef, 'versions'));

  return runTransaction(db, async transaction => {
    const currentSnapshot = await transaction.get(currentRef);
    const currentData = currentSnapshot.exists() ? currentSnapshot.data() : null;
    const nextRevision = Number(currentData?.revision || 0) + 1;
    const payload = createMapConfigPayload({
      ...nextConfig,
      revision: nextRevision,
      updatedBy: actorEmail
    });

    if (currentData) {
      transaction.set(versionRef, createMapVersionPayload(currentData, {
        versionId: versionRef.id,
        archivedBy: actorEmail,
        reason
      }));
    }

    transaction.set(currentRef, payload);
    return { revision: nextRevision, backupVersionId: currentData ? versionRef.id : null };
  });
}

export async function listMapConfigVersions(db, maxResults = 20) {
  const versionsRef = collection(db, 'system', 'mapConfig', 'versions');
  const snapshot = await getDocs(query(
    versionsRef,
    orderBy('archivedAtIso', 'desc'),
    limit(maxResults)
  ));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function restoreMapConfigVersion(db, version, { actorEmail = '' } = {}) {
  if (!version) throw new Error('找不到要復原的地圖版本');

  const restored = Object.fromEntries(
    Object.entries(version).filter(([key]) => !OMIT_FROM_RESTORE.has(key))
  );

  return saveMapConfigWithBackup(db, restored, {
    actorEmail,
    reason: `復原至版本 ${version.versionId || version.id || '未知'}`
  });
}
