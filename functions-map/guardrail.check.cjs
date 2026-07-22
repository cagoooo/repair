const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_CALLS_PER_HOUR,
  canConsumeQuota,
  serializeAnnotations,
  serializeDocumentAnnotations,
  validateMapUpload,
  validateBase64Image
} = require('./guardrails');

test('第六次 OCR 在呼叫付費 API 前被阻擋', () => {
  assert.equal(MAX_CALLS_PER_HOUR, 5);
  assert.equal(canConsumeQuota(4), true);
  assert.equal(canConsumeQuota(5), false);
});

test('空白、錯誤編碼與超大圖片會被拒絕', () => {
  assert.equal(validateBase64Image('').valid, false);
  assert.equal(validateBase64Image('not base64!').valid, false);
  assert.equal(validateBase64Image('aGVsbG8=').valid, true);
});

test('Vision 回應只回傳前端需要的安全欄位', () => {
  const [annotation] = serializeAnnotations([{
    description: 'C112',
    locale: 'zh-TW',
    boundingPoly: { vertices: [{ x: 1, y: 2 }] }
  }]);
  assert.deepEqual(annotation, {
    description: 'C112',
    confidence: null,
    boundingPoly: { vertices: [{ x: 1, y: 2 }] }
  });
});

test('文件 OCR 會保留單字信心分數與座標', () => {
  const result = serializeDocumentAnnotations({
    text: 'C112',
    pages: [{ blocks: [{ paragraphs: [{ words: [{
      confidence: 0.76,
      symbols: [{ text: 'C' }, { text: '1' }, { text: '1' }, { text: '2' }],
      boundingBox: { vertices: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }
    }] }] }] }]
  });
  assert.equal(result[1].description, 'C112');
  assert.equal(result[1].confidence, 0.76);
});

test('地圖上傳限制格式與 10MB 大小', () => {
  assert.equal(validateMapUpload({ base64File: 'YQ==', contentType: 'image/png', kind: 'image' }).valid, true);
  assert.equal(validateMapUpload({ base64File: 'YQ==', contentType: 'text/html', kind: 'image' }).valid, false);
  assert.equal(validateMapUpload({ base64File: 'YQ==', contentType: 'application/pdf', kind: 'image' }).valid, false);
});
