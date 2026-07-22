import { describe, expect, it, vi } from 'vitest';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(() => ({ __type: 'serverTimestamp' }))
}));

import {
  createMapConfigPayload,
  createMapVersionPayload,
  MAP_CONFIG_SCHEMA_VERSION
} from './mapConfigService';

const rooms = [{
  id: 'legacy-id',
  code: 'C112',
  name: '二年甲班',
  category: 'classroom',
  bounds: { x: 1, y: 2, width: 3, height: 4 }
}];

describe('mapConfigService payload', () => {
  it('建立含 schema、revision 與來源資訊的新配置', () => {
    const payload = createMapConfigPayload({
      rooms,
      mapImageUrl: 'https://example.com/map.png',
      academicYear: '新學期',
      source: { type: 'pdf', pageNumber: 1 },
      revision: 3,
      updatedBy: 'admin@example.com'
    });

    expect(payload).toMatchObject({
      schemaVersion: MAP_CONFIG_SCHEMA_VERSION,
      revision: 3,
      academicYear: '新學期',
      mapImageUrl: 'https://example.com/map.png',
      source: { type: 'pdf', pageNumber: 1 },
      updatedBy: 'admin@example.com'
    });
    expect(payload.mapImage).toBeUndefined();
  });

  it('拒絕缺圖或不合法教室資料', () => {
    expect(() => createMapConfigPayload({ rooms })).toThrow('缺少教室配置圖');
    expect(() => createMapConfigPayload({ rooms: [{ ...rooms[0], code: '' }], mapImage: 'data:image/png;base64,a' }))
      .toThrow('教室資料驗證失敗');
  });

  it('備份保留原配置並加入稽核欄位', () => {
    const backup = createMapVersionPayload({ revision: 2, rooms }, {
      versionId: 'backup-1',
      archivedBy: 'admin@example.com'
    });
    expect(backup).toMatchObject({
      versionId: 'backup-1',
      sourceRevision: 2,
      archivedBy: 'admin@example.com'
    });
  });
});
