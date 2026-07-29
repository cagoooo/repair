import { describe, expect, it } from 'vitest';
import { createMapBackupSnapshot, validateMapBackupSnapshot } from './mapSnapshotService';

const room = code => ({
  id: code,
  code,
  name: `${code} 教室`,
  category: 'classroom',
  bounds: { x: 1, y: 1, width: 5, height: 5 }
});

describe('mapSnapshotService', () => {
  it('建立包含資料稽核與校驗碼的發布前快照', () => {
    const snapshot = createMapBackupSnapshot({
      academicYear: '114學年度',
      revision: 3,
      mapImage: 'https://example.com/map.png',
      rooms: [room('C101'), room('C102')],
      repairs: [{ id: 'r1', roomCode: 'C101' }]
    });
    expect(snapshot.audit).toMatchObject({ roomCount: 2, repairCount: 1, unresolvedRepairCount: 0 });
    expect(validateMapBackupSnapshot(snapshot)).toEqual({ valid: true, errors: [] });
  });

  it('內容遭修改時校驗失敗', () => {
    const snapshot = createMapBackupSnapshot({ mapImage: 'map.png', rooms: [room('C101')] });
    snapshot.rooms[0].name = '遭修改';
    expect(validateMapBackupSnapshot(snapshot).errors).toContain('快照校驗碼不一致');
  });
});
