import { describe, expect, it } from 'vitest';
import { applyRoomBatchChanges, selectRoomIds } from './roomBatchService';

const rooms = [
  { id: '1', code: 'C101', name: 'C101 一年一班', category: 'classroom', confidence: 0.7 },
  { id: '2', code: 'C102', name: 'C102 一年二班', category: 'classroom', hidden: true },
  { id: '3', code: 'W101', name: 'W101 廁所', category: 'utility' }
];

describe('roomBatchService', () => {
  it('可依搜尋、低信心與隱藏狀態選取', () => {
    expect(selectRoomIds(rooms, 'search', '一年')).toEqual(['1', '2']);
    expect(selectRoomIds(rooms, 'low_confidence')).toEqual(['1']);
    expect(selectRoomIds(rooms, 'hidden')).toEqual(['2']);
  });

  it('只修改選取教室並保留編號前綴', () => {
    const result = applyRoomBatchChanges(rooms, ['1', '2'], {
      findText: '一年',
      replaceText: '二年',
      category: 'special',
      visibility: 'show'
    });
    expect(result.affectedCount).toBe(2);
    expect(result.rooms[0]).toMatchObject({ name: 'C101 二年一班', category: 'special' });
    expect(result.rooms[1].hidden).toBe(false);
    expect(result.rooms[2]).toEqual(rooms[2]);
  });
});
