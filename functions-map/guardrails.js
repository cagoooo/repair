const MAX_CALLS_PER_HOUR = 5;
// 對齊前端與 Storage 的 10MB 圖片上限，並保留 Base64 編碼空間。
const MAX_BASE64_CHARS = 14 * 1024 * 1024;

function currentHourKey(date = new Date()) {
  return date.toISOString().slice(0, 13).replace(/[-T]/g, '');
}

function canConsumeQuota(currentCount) {
  return Number(currentCount || 0) < MAX_CALLS_PER_HOUR;
}

function validateBase64Image(value) {
  const base64Image = String(value || '');
  if (!base64Image || base64Image.length > MAX_BASE64_CHARS) {
    return { valid: false, reason: 'size' };
  }
  if (!/^[A-Za-z0-9+/=]+$/.test(base64Image)) {
    return { valid: false, reason: 'format' };
  }
  return { valid: true, base64Image };
}

function serializeAnnotations(annotations = []) {
  return annotations.map(annotation => ({
    description: annotation.description || '',
    boundingPoly: {
      vertices: (annotation.boundingPoly?.vertices || []).map(vertex => ({
        x: Number(vertex.x || 0),
        y: Number(vertex.y || 0)
      }))
    }
  }));
}

module.exports = {
  MAX_CALLS_PER_HOUR,
  MAX_BASE64_CHARS,
  currentHourKey,
  canConsumeQuota,
  validateBase64Image,
  serializeAnnotations
};
