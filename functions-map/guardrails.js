const MAX_CALLS_PER_HOUR = 5;
// 對齊前端與 Storage 的 10MB 圖片上限，並保留 Base64 編碼空間。
const MAX_BASE64_CHARS = 14 * 1024 * 1024;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'
]);

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
    confidence: Number.isFinite(annotation.confidence) ? Number(annotation.confidence) : null,
    boundingPoly: {
      vertices: (annotation.boundingPoly?.vertices || []).map(vertex => ({
        x: Number(vertex.x || 0),
        y: Number(vertex.y || 0)
      }))
    }
  }));
}

function serializeDocumentAnnotations(fullTextAnnotation) {
  if (!fullTextAnnotation) return [];
  const annotations = [{
    description: fullTextAnnotation.text || '',
    confidence: 1,
    boundingPoly: { vertices: [] }
  }];

  for (const page of fullTextAnnotation.pages || []) {
    for (const block of page.blocks || []) {
      for (const paragraph of block.paragraphs || []) {
        for (const word of paragraph.words || []) {
          const description = (word.symbols || []).map(symbol => symbol.text || '').join('').trim();
          if (!description) continue;
          annotations.push({
            description,
            confidence: Number.isFinite(word.confidence) ? Number(word.confidence) :
              (Number.isFinite(paragraph.confidence) ? Number(paragraph.confidence) : null),
            boundingPoly: {
              vertices: (word.boundingBox?.vertices || []).map(vertex => ({
                x: Number(vertex.x || 0),
                y: Number(vertex.y || 0)
              }))
            }
          });
        }
      }
    }
  }
  return annotations;
}

function validateMapUpload({ base64File, contentType, kind }) {
  const base64 = String(base64File || '');
  const expectedKind = contentType === 'application/pdf' ? 'pdf' : 'image';
  if (!ALLOWED_UPLOAD_TYPES.has(contentType) || kind !== expectedKind) {
    return { valid: false, reason: 'type' };
  }
  if (!base64 || base64.length > MAX_BASE64_CHARS || !/^[A-Za-z0-9+/=]+$/.test(base64)) {
    return { valid: false, reason: 'content' };
  }
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length || buffer.length > MAX_FILE_BYTES) {
    return { valid: false, reason: 'size' };
  }
  return { valid: true, buffer };
}

module.exports = {
  MAX_CALLS_PER_HOUR,
  MAX_BASE64_CHARS,
  MAX_FILE_BYTES,
  currentHourKey,
  canConsumeQuota,
  validateBase64Image,
  serializeAnnotations,
  serializeDocumentAnnotations,
  validateMapUpload
};
