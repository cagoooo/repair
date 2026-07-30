import { describe, expect, it, vi } from 'vitest';

vi.mock('../firebase', () => ({ functions: {} }));
vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn() }));

import { convertPixelToPercent, parseVisionAnnotations } from './visionService';
import regressionSamples from '../../tests/fixtures/map-ocr-regression.json';
import textLayer115 from '../../tests/fixtures/map-115-textlayer.json';

const annotation = (description, x, y, width, height, confidence) => ({
  description,
  confidence,
  boundingPoly: {
    vertices: [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height }
    ]
  }
});

const sampleAnnotations = sample => sample.map(item => annotation(
  item.text,
  item.x,
  item.y,
  item.width,
  item.height,
  item.confidence
));

describe('visionService parser', () => {
  it('辨識一般教室編號、名稱與直排廁所編號', () => {
    const rooms = parseVisionAnnotations([
      annotation('C112 二年甲班 W301 廁所', 0, 0, 200, 40),
      annotation('C112', 10, 10, 28, 8),
      annotation('二年甲班', 10, 20, 28, 8),
      annotation('W', 100, 10, 8, 6),
      annotation('301', 100, 17, 12, 6),
      annotation('廁所', 100, 24, 18, 6)
    ]);

    expect(rooms.map(room => room.code).sort()).toEqual(['C112', 'W301']);
    expect(rooms.find(room => room.code === 'C112')?.name).toContain('二年甲班');
    expect(rooms.find(room => room.code === 'W301')?.category).toBe('utility');
  });

  it('將 OCR 像素座標換算為百分比', () => {
    const [room] = convertPixelToPercent([{
      id: 'C112',
      code: 'C112',
      name: '二年甲班',
      pixelBounds: { x: 20, y: 10, width: 40, height: 20 }
    }], 200, 100);

    expect(room.bounds).toEqual({ x: 10, y: 10, width: 20, height: 20 });
  });

  it('回歸樣本可辨識人工保留的 C640 幼兒園', () => {
    const rooms = parseVisionAnnotations(sampleAnnotations(regressionSamples.manualKindergarten));
    const room = rooms.find(item => item.code === 'C640');
    expect(room?.name).toContain('幼兒園');
    expect(room?.confidence).toBeCloseTo(0.91);
  });

  it('密集教室不會互相吞併，並保留低信心資訊', () => {
    const rooms = parseVisionAnnotations(sampleAnnotations(regressionSamples.denseClassrooms));
    expect(rooms.map(room => room.code).sort()).toEqual(['C111', 'C112']);
    expect(rooms.find(room => room.code === 'C111')?.name).toContain('一年一班');
    expect(rooms.find(room => room.code === 'C112')?.name).toContain('一年二班');
    expect(rooms.find(room => room.code === 'C112')?.confidence).toBeCloseTo(0.72);
  });

  it('回歸樣本可修復直排廁所編號', () => {
    const rooms = parseVisionAnnotations(sampleAnnotations(regressionSamples.verticalToilet));
    expect(rooms).toHaveLength(1);
    expect(rooms[0].code).toBe('W301');
    expect(rooms[0].category).toBe('utility');
  });
});

// 115 學年度實圖回歸基準（2026/07/30 離線演練建立）
// 只鎖住「編號層」的保證：編號齊全、無重複、無空白、直排編號可還原。
// 名稱聚合完整度目前為已知缺口，記錄於 docs/115-map-rehearsal-report-20260730.md，不在此鎖定。
describe('115 學年度實圖文字層回歸', () => {
  const rooms = parseVisionAnnotations(sampleAnnotations(textLayer115.words));
  const codes = rooms.map(room => room.code);

  it('辨識出全部 100 間有編號教室且沒有重複或空白編號', () => {
    expect(rooms).toHaveLength(textLayer115.meta.expectedRoomCount);
    expect(new Set(codes).size).toBe(textLayer115.meta.expectedRoomCount);
    expect(codes.every(code => /^[CWS]\d{3}$/.test(code))).toBe(true);
  });

  it('還原全部直排廁所編號並歸類為 utility', () => {
    textLayer115.meta.verticalToiletCodes.forEach(code => {
      const room = rooms.find(item => item.code === code);
      expect(room, `${code} 應被還原`).toBeTruthy();
      expect(room.category).toBe('utility');
    });
  });

  it('不會憑空生出圖上沒有的人工必查教室', () => {
    expect(codes).not.toContain(textLayer115.meta.manualRoomAbsent);
  });

  it('換算後的座標全部落在圖片範圍內', () => {
    const percent = convertPixelToPercent(rooms, textLayer115.meta.imageWidth, textLayer115.meta.imageHeight);
    percent.forEach(room => {
      const { x, y, width, height } = room.bounds;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + width).toBeLessThanOrEqual(100);
      expect(y + height).toBeLessThanOrEqual(100);
    });
  });
});
