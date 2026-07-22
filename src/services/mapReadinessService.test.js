import { describe, expect, it } from 'vitest';
import { buildMapReadinessReport, createRehearsalReport } from './mapReadinessService';

const room = (code, overrides = {}) => ({
  id: code,
  code,
  name: `${code} 教室`,
  category: 'classroom',
  bounds: { x: 1, y: 1, width: 5, height: 5 },
  reviewStatus: 'confirmed',
  ...overrides
});

const readyInput = () => ({
  academicYear: '115學年度第1學期',
  baselineRooms: [room('C112'), room('C640')],
  rooms: [room('C112'), room('C640')],
  repairs: [{ roomCode: 'C112' }],
  workflow: {
    imageUploaded: true,
    ocrCompleted: true,
    differencesReviewed: true,
    calibrationConfirmed: true
  },
  updateMode: true,
  acknowledgedWarnings: []
});

describe('mapReadinessService', () => {
  it('完整換版資料可以發布', () => {
    expect(buildMapReadinessReport(readyInput()).canPublish).toBe(true);
  });

  it('缺少流程步驟、人工教室或歷史連結時硬性阻擋', () => {
    const input = readyInput();
    input.workflow.ocrCompleted = false;
    input.rooms = [room('C999')];
    const report = buildMapReadinessReport(input);
    expect(report.canPublish).toBe(false);
    expect(report.errors.map(item => item.id)).toEqual(expect.arrayContaining([
      'workflow-ocrCompleted', 'repair-links', 'manual-missing-C640'
    ]));
  });

  it('座標越界會阻擋，過小則需人工確認', () => {
    const input = readyInput();
    input.rooms[0] = room('C112', { bounds: { x: 99, y: 1, width: 5, height: 5 } });
    input.rooms[1] = room('C640', { bounds: { x: 1, y: 1, width: 0.4, height: 5 } });
    const report = buildMapReadinessReport(input);
    expect(report.errors.some(item => item.id === 'bounds-C112')).toBe(true);
    expect(report.warnings.some(item => item.id === 'small-C640')).toBe(true);
  });

  it('警告必須逐項確認才可發布', () => {
    const input = readyInput();
    input.rooms[1] = room('C640', { reviewStatus: '' });
    const first = buildMapReadinessReport(input);
    expect(first.pendingWarnings).toHaveLength(1);
    input.acknowledgedWarnings = [first.pendingWarnings[0].id];
    expect(buildMapReadinessReport(input).canPublish).toBe(true);
  });

  it('演練報告永遠標記 rehearsal 且不寫入資料', () => {
    const report = createRehearsalReport(readyInput());
    expect(report).toMatchObject({ mode: 'rehearsal', academicYear: '115學年度第1學期' });
  });
});
