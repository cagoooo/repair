import { describe, expect, it } from 'vitest';
import { buildRoomVisualDiffs, getRoomDiffTone } from './roomDiffService';

const room = (code, overrides = {}) => ({
  id: code,
  code,
  name: `${code} 舊名稱`,
  bounds: { x: 1, y: 1, width: 5, height: 5 },
  ...overrides
});

describe('roomDiffService', () => {
  it('區分新增、遺失、移動與更名', () => {
    const report = buildRoomVisualDiffs(
      [room('C101'), room('C102'), room('C103')],
      [room('C101', { bounds: { x: 3, y: 1, width: 5, height: 5 } }), room('C102', { name: 'C102 新名稱' }), room('C104')]
    );
    expect(report.summary).toMatchObject({ added: 1, missing: 1, moved: 1, renamed: 1 });
    expect(getRoomDiffTone(report.diffs.find(item => item.code === 'C104'))).toBe('added');
  });
});
