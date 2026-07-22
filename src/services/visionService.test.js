import { describe, expect, it, vi } from 'vitest';

vi.mock('../firebase', () => ({ functions: {} }));
vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn() }));

import { convertPixelToPercent, parseVisionAnnotations } from './visionService';

const annotation = (description, x, y, width, height) => ({
  description,
  boundingPoly: {
    vertices: [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height }
    ]
  }
});

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
});
