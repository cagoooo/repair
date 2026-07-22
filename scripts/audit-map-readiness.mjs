import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarizeMapBaseline } from '../src/services/roomConfigService.js';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const baseline = JSON.parse(readFileSync(join(rootDir, 'docs', 'map-readiness-baseline.json'), 'utf8'));
const projectId = baseline.projectId;
const apiRoot = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

function decodeValue(value = {}) {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if (value.arrayValue) return (value.arrayValue.values || []).map(decodeValue);
  if (value.mapValue) return decodeFields(value.mapValue.fields || {});
  return undefined;
}

function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

async function getJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`讀取正式資料失敗：${response.status}`);
  return response.json();
}

async function listRepairs() {
  const repairs = [];
  let pageToken = '';
  do {
    const url = new URL(`${apiRoot}/repairs`);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const page = await getJson(url);
    repairs.push(...(page.documents || []).map(item => decodeFields(item.fields)));
    pageToken = page.nextPageToken || '';
  } while (pageToken);
  return repairs;
}

const mapDocument = await getJson(`${apiRoot}/system/mapConfig`);
const mapConfig = decodeFields(mapDocument.fields);
const repairs = await listRepairs();
const summary = summarizeMapBaseline(mapConfig.rooms || [], repairs);
const uniqueRoomCodes = new Set((mapConfig.rooms || []).map(room => room.code)).size;
const uniqueRoomIds = new Set((mapConfig.rooms || []).map(room => room.id)).size;

const result = {
  checkedAt: new Date().toISOString(),
  projectId,
  revision: mapConfig.revision || 0,
  academicYear: mapConfig.academicYear || '',
  roomCount: summary.roomCount,
  uniqueRoomCodes,
  uniqueRoomIds,
  repairCount: summary.repairCount,
  unresolvedRepairCount: summary.unresolvedRepairCount,
  roomValidationErrors: summary.validation.errors
};

console.log(JSON.stringify(result, null, 2));

const safe = summary.validation.valid &&
  uniqueRoomCodes === summary.roomCount &&
  uniqueRoomIds === summary.roomCount &&
  summary.unresolvedRepairCount === 0 &&
  summary.roomCount >= baseline.roomCount;

if (!safe) {
  console.error('✗ 正式教室資料低於新學期安全基準，禁止直接套用新配置。');
  process.exit(1);
}

console.log('✓ 正式教室資料符合新學期安全基準。');
