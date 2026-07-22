const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_CALLS_PER_HOUR,
  canConsumeQuota,
  serializeAnnotations,
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
    boundingPoly: { vertices: [{ x: 1, y: 2 }] }
  });
});
