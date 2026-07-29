import { getRoomDisplayName, normalizeRoomCode } from './roomConfigService';

const POSITION_TOLERANCE = 0.25;

function moved(before, after) {
  return ['x', 'y', 'width', 'height'].some(key =>
    Math.abs(Number(before?.bounds?.[key] || 0) - Number(after?.bounds?.[key] || 0)) > POSITION_TOLERANCE
  );
}

export function buildRoomVisualDiffs(baselineRooms = [], rooms = []) {
  const beforeByCode = new Map(baselineRooms.map(room => [normalizeRoomCode(room.code), room]));
  const afterByCode = new Map(rooms.map(room => [normalizeRoomCode(room.code), room]));
  const codes = new Set([...beforeByCode.keys(), ...afterByCode.keys()]);
  const diffs = [];

  codes.forEach(code => {
    const before = beforeByCode.get(code) || null;
    const after = afterByCode.get(code) || null;
    const flags = [];
    if (!before) flags.push('added');
    else if (!after) flags.push('missing');
    else {
      if (moved(before, after)) flags.push('moved');
      if (getRoomDisplayName(before) !== getRoomDisplayName(after)) flags.push('renamed');
      if (Boolean(before.hidden) !== Boolean(after.hidden)) flags.push('visibility');
      if (flags.length === 0) flags.push('unchanged');
    }
    diffs.push({ code, before, after, flags });
  });

  return {
    diffs,
    summary: {
      added: diffs.filter(item => item.flags.includes('added')).length,
      missing: diffs.filter(item => item.flags.includes('missing')).length,
      moved: diffs.filter(item => item.flags.includes('moved')).length,
      renamed: diffs.filter(item => item.flags.includes('renamed')).length,
      visibility: diffs.filter(item => item.flags.includes('visibility')).length,
      unchanged: diffs.filter(item => item.flags.includes('unchanged')).length
    }
  };
}

export function getRoomDiffTone(diff) {
  if (diff.flags.includes('missing')) return 'missing';
  if (diff.flags.includes('added')) return 'added';
  if (diff.flags.includes('moved')) return 'moved';
  if (diff.flags.includes('renamed')) return 'renamed';
  if (diff.flags.includes('visibility')) return 'visibility';
  return 'unchanged';
}
