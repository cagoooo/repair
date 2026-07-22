import { describe, expect, it } from 'vitest';
import {
  applyReviewDecisions,
  getRoomDisplayName,
  mergeRoomsByCode,
  normalizeRoomCode,
  resolveRoom,
  summarizeMapBaseline,
  validateRooms
} from './roomConfigService';

const room = (code, name, id = `legacy_${code}`, x = 1) => ({
  id,
  code,
  name,
  category: 'classroom',
  bounds: { x, y: 1, width: 5, height: 5 }
});

describe('roomConfigService', () => {
  it('標準化教室編號並移除名稱中的編號前綴', () => {
    expect(normalizeRoomCode(' c 112 ')).toBe('C112');
    expect(getRoomDisplayName(room('C112', 'C112 二年甲班'))).toBe('二年甲班');
  });

  it('重新辨識時依編號保留既有穩定 ID', () => {
    const current = [room('C112', 'C112 二年甲班', 'vision_old_1')];
    const detected = [room('C112', 'C112 三年甲班', 'vision_new_9', 10)];
    const result = mergeRoomsByCode(current, detected);

    expect(result.canApply).toBe(true);
    expect(result.mergedRooms[0]).toMatchObject({
      id: 'vision_old_1',
      code: 'C112',
      name: 'C112 三年甲班'
    });
    expect(result.updated).toHaveLength(1);
    expect(result.reviewItems[0]).toMatchObject({ code: 'C112', reasons: ['name_changed'] });
  });

  it('疑慮教室必須決定後才能套用，並可選擇沿用舊資料', () => {
    const current = [room('C112', '舊班名')];
    const result = mergeRoomsByCode(current, [room('C112', '新班名', 'new-id')]);
    expect(() => applyReviewDecisions(result, {})).toThrow('尚有 1 間');
    const applied = applyReviewDecisions(result, { C112: 'keep' });
    expect(applied.rooms[0]).toMatchObject({ name: '舊班名', reviewStatus: 'kept' });
  });

  it('OCR 未辨識的人工教室會保留而不是被刪除', () => {
    const current = [room('C112', '二年甲班'), room('C640', '幼兒園', 'room_manual')];
    const detected = [room('C112', '三年甲班', 'vision_new')];
    const result = mergeRoomsByCode(current, detected);

    expect(result.preserved.map(item => item.code)).toEqual(['C640']);
    expect(result.mergedRooms.find(item => item.code === 'C640')?.id).toBe('room_manual');
  });

  it('新教室使用教室編號作為穩定 ID', () => {
    const result = mergeRoomsByCode([], [room('C999', '新教室', 'vision_random')]);
    expect(result.mergedRooms[0].id).toBe('C999');
  });

  it('重複編號會阻止正式套用', () => {
    const result = mergeRoomsByCode([], [room('C112', '甲'), room('C112', '乙')]);
    expect(result.canApply).toBe(false);
    expect(result.duplicateDetectedCodes).toEqual(['C112']);
  });

  it('歷史報修優先依固定教室編號解析', () => {
    const rooms = [room('C112', '新班名', 'new-id')];
    expect(resolveRoom(rooms, {
      roomId: 'old-id',
      roomCode: 'C112',
      roomName: '舊班名'
    })?.id).toBe('new-id');
  });

  it('驗證空白、重複及無效座標', () => {
    const invalid = [room('C112', '甲'), { ...room('C112', '乙'), id: '' }];
    invalid[0].bounds.width = 0;
    const result = validateRooms(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(error => error.includes('重複'))).toBe(true);
  });

  it('產生換學期前資料基準摘要', () => {
    const rooms = [room('C112', '甲')];
    const result = summarizeMapBaseline(rooms, [
      { roomCode: 'C112' },
      { roomCode: 'C999' }
    ]);
    expect(result).toMatchObject({ roomCount: 1, repairCount: 2, unresolvedRepairCount: 1 });
  });
});
