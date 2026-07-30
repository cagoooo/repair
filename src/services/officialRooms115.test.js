import { describe, expect, it } from 'vitest';
import { OFFICIAL_ROOMS_115, OFFICIAL_ROOMS_115_MAP } from '../data/officialRooms115';
import { parseVisionAnnotations } from './visionService';

describe('115 學年度官方權威教室資料庫 (SSOT) 測試', () => {
  it('包含全部 101 間教室，且沒有重複編號', () => {
    expect(OFFICIAL_ROOMS_115).toHaveLength(101);
    expect(OFFICIAL_ROOMS_115_MAP.size).toBe(101);
  });

  it('關鍵教室 (C135, C302, C134, C208, C640) 名稱與類別正確記錄', () => {
    expect(OFFICIAL_ROOMS_115_MAP.get('C135')).toMatchObject({ name: '禮堂', category: 'special' });
    expect(OFFICIAL_ROOMS_115_MAP.get('C302')).toMatchObject({ name: '圖書館', category: 'special' });
    expect(OFFICIAL_ROOMS_115_MAP.get('C134')).toMatchObject({ name: '保健室', category: 'office' });
    expect(OFFICIAL_ROOMS_115_MAP.get('C208')).toMatchObject({ name: '教務處', category: 'office' });
    expect(OFFICIAL_ROOMS_115_MAP.get('C640')).toMatchObject({ name: '幼兒園', category: 'special' });
  });

  it('AI 辨識編號後自動優先帶入 115 官方校正權威名稱', () => {
    const ann = (description, x, y, width = 20, height = 20) => ({
      description,
      confidence: 0.9,
      boundingPoly: {
        vertices: [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }]
      }
    });

    const result = parseVisionAnnotations([
      ann('C135 C302 C134 C208 W101 S104', 0, 0, 200, 40),
      ann('C135', 10, 10),
      ann('C302', 40, 10),
      ann('C134', 70, 10),
      ann('C208', 100, 10),
      ann('W101', 130, 10),
      ann('S104', 160, 10)
    ]);

    const find = code => result.find(r => r.code === code);
    expect(find('C135')?.name).toBe('C135 禮堂');
    expect(find('C302')?.name).toBe('C302 圖書館');
    expect(find('C134')?.name).toBe('C134 保健室');
    expect(find('C208')?.name).toBe('C208 教務處');
    expect(find('W101')?.name).toBe('W101 廁所');
    expect(find('S104')?.name).toBe('S104 樓梯');
  });
});
