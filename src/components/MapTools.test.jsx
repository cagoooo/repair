import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MapComparisonPanel from './MapComparisonPanel';
import RoomBatchEditor from './RoomBatchEditor';

const oldRooms = [{
  id: 'c101', code: 'C101', name: 'C101 一年一班', category: 'classroom',
  bounds: { x: 10, y: 10, width: 5, height: 5 }
}];
const newRooms = [
  { ...oldRooms[0], name: 'C101 二年一班', bounds: { x: 12, y: 10, width: 5, height: 5 } },
  { id: 'c102', code: 'C102', name: 'C102 二年二班', category: 'classroom', bounds: { x: 20, y: 10, width: 5, height: 5 } }
];

describe('新學期配置操作工具', () => {
  it('可切換新舊配置的疊圖與並排檢視', () => {
    render(<MapComparisonPanel
      open
      baselineImage="old.png"
      image="new.png"
      baselineRooms={oldRooms}
      rooms={newRooms}
      onClose={() => {}}
    />);

    expect(screen.getByText('新增 1')).toBeTruthy();
    expect(screen.getByText('移動 1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '左右並排' }));
    expect(screen.getByAltText('舊配置')).toBeTruthy();
    expect(screen.getByAltText('新配置')).toBeTruthy();
  });

  it('批次取代名稱後只套用到選取教室', () => {
    const onApply = vi.fn();
    render(<RoomBatchEditor
      open
      rooms={newRooms}
      selectedIds={['c101']}
      onApply={onApply}
      onClose={() => {}}
    />);

    fireEvent.change(screen.getByLabelText('尋找名稱文字'), { target: { value: '二年' } });
    fireEvent.change(screen.getByLabelText('取代為'), { target: { value: '三年' } });
    expect(screen.getByText('1', { selector: 'strong' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '套用批次修改' }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0][0].name).toBe('C101 三年一班');
    expect(onApply.mock.calls[0][0][1].name).toBe('C102 二年二班');
    expect(onApply.mock.calls[0][1]).toBe(1);
  });
});
