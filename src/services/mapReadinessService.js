import { normalizeRoomCode, resolveRoom, validateRooms } from './roomConfigService';

export const MANUAL_CONFIRM_ROOM_CODES = ['C640'];

function issue(id, severity, title, detail, extra = {}) {
  return { id, severity, title, detail, ...extra };
}

function aspectRatio(source = {}) {
  const width = Number(source.width || source.imageWidth);
  const height = Number(source.height || source.imageHeight);
  return width > 0 && height > 0 ? width / height : null;
}

export function buildMapReadinessReport({
  academicYear = '',
  baselineRooms = [],
  rooms = [],
  repairs = [],
  baselineSource = {},
  source = {},
  workflow = {},
  updateMode = false,
  unresolvedReviewItems = [],
  acknowledgedWarnings = []
} = {}) {
  const issues = [];
  const validation = validateRooms(rooms);
  validation.errors.forEach((detail, index) => {
    issues.push(issue(`room-validation-${index}`, 'error', '教室資料格式錯誤', detail));
  });

  if (updateMode && !academicYear.trim()) {
    issues.push(issue('academic-year', 'error', '尚未填寫學年度／學期', '請先填寫例如「115學年度第1學期」。'));
  }

  if (updateMode) {
    const requiredSteps = [
      ['imageUploaded', '尚未上傳新配置圖'],
      ['ocrCompleted', '尚未執行 AI 辨識'],
      ['differencesReviewed', '尚未確認新舊配置差異'],
      ['calibrationConfirmed', '尚未確認教室框位置']
    ];
    requiredSteps.forEach(([key, title]) => {
      if (!workflow[key]) issues.push(issue(`workflow-${key}`, 'error', title, '完成此步驟後才能正式發布。'));
    });
  }

  if (baselineRooms.length > 0) {
    const delta = Math.abs(rooms.length - baselineRooms.length);
    const ratio = delta / baselineRooms.length;
    if (ratio > 0.25) {
      issues.push(issue('room-count-critical', 'error', '教室總數變動過大', `由 ${baselineRooms.length} 間變成 ${rooms.length} 間，請確認是否誤刪或重複辨識。`));
    } else if (ratio > 0.1) {
      issues.push(issue('room-count-warning', 'warning', '教室總數有明顯變動', `由 ${baselineRooms.length} 間變成 ${rooms.length} 間，請人工確認。`));
    }
  }

  rooms.forEach(room => {
    const bounds = room.bounds || {};
    const code = normalizeRoomCode(room.code) || room.id;
    if (Number(bounds.x) < 0 || Number(bounds.y) < 0 ||
        Number(bounds.x) + Number(bounds.width) > 100 ||
        Number(bounds.y) + Number(bounds.height) > 100) {
      issues.push(issue(`bounds-${code}`, 'error', `${code} 教室框超出圖片`, '請將教室框完整移回配置圖範圍內。', { roomCode: code }));
    } else if (Number(bounds.width) < 0.5 || Number(bounds.height) < 0.5) {
      issues.push(issue(`small-${code}`, 'warning', `${code} 教室框異常過小`, '請確認不是誤畫或 OCR 產生的雜訊。', { roomCode: code }));
    }
  });

  const oldRatio = aspectRatio(baselineSource);
  const newRatio = aspectRatio(source);
  if (oldRatio && newRatio) {
    const ratioDelta = Math.abs(newRatio - oldRatio) / oldRatio;
    if (ratioDelta > 0.15) {
      issues.push(issue('image-ratio-critical', 'error', '新舊圖片比例差異過大', '舊座標可能無法安全沿用，請重新辨識並逐區校正。'));
    } else if (ratioDelta > 0.05) {
      issues.push(issue('image-ratio-warning', 'warning', '新舊圖片比例不同', '請特別抽查沿用舊座標的教室。'));
    }
  }

  const unresolvedRepairs = repairs.filter(repair => !resolveRoom(rooms, repair));
  if (unresolvedRepairs.length > 0) {
    issues.push(issue('repair-links', 'error', '歷史報修將失去教室連結', `共有 ${unresolvedRepairs.length} 筆報修找不到對應教室。`));
  }

  MANUAL_CONFIRM_ROOM_CODES.forEach(code => {
    const room = rooms.find(item => normalizeRoomCode(item.code) === code);
    if (!room) {
      issues.push(issue(`manual-missing-${code}`, 'error', `${code} 人工教室遺失`, '此教室不一定能被 OCR 辨識，必須保留或人工確認。'));
    } else if (updateMode && !['confirmed', 'kept'].includes(room.reviewStatus)) {
      issues.push(issue(`manual-confirm-${code}`, 'warning', `${code} 尚未人工確認`, '請確認幼兒園位置與名稱後再發布。', { roomCode: code }));
    }
  });

  unresolvedReviewItems.forEach(item => {
    issues.push(issue(`review-${item.code}`, 'error', `${item.code} 尚未完成疑慮處理`, '請選擇確認、保留舊資料、手動修正或暫不顯示。', { roomCode: item.code }));
  });

  const acknowledged = new Set(acknowledgedWarnings);
  const errors = issues.filter(item => item.severity === 'error');
  const warnings = issues.filter(item => item.severity === 'warning');
  const pendingWarnings = warnings.filter(item => !acknowledged.has(item.id));

  return {
    checkedAt: new Date().toISOString(),
    metrics: {
      baselineRoomCount: baselineRooms.length,
      roomCount: rooms.length,
      repairCount: repairs.length,
      unresolvedRepairCount: unresolvedRepairs.length,
      errorCount: errors.length,
      warningCount: warnings.length
    },
    issues,
    errors,
    warnings,
    pendingWarnings,
    canPublish: errors.length === 0 && pendingWarnings.length === 0
  };
}

export function createRehearsalReport(input) {
  const report = buildMapReadinessReport(input);
  return {
    mode: 'rehearsal',
    academicYear: input.academicYear || '',
    generatedAt: new Date().toISOString(),
    source: input.source || {},
    ocrMetrics: input.workflow?.ocrMetrics || {},
    ...report
  };
}
