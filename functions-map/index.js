const { setGlobalOptions } = require('firebase-functions/v2');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const vision = require('@google-cloud/vision');
const {
  MAX_CALLS_PER_HOUR,
  currentHourKey,
  canConsumeQuota,
  validateBase64Image,
  serializeAnnotations
} = require('./guardrails');

initializeApp();
setGlobalOptions({ region: 'us-central1', maxInstances: 3 });

const db = getFirestore();
const visionClient = new vision.ImageAnnotatorClient();
const PRIMARY_ADMIN = 'ipad@mail2.smes.tyc.edu.tw';

async function assertRepairAdmin(auth) {
  if (!auth?.uid || !auth.token?.email) {
    throw new HttpsError('unauthenticated', '請先使用管理員帳號登入。');
  }

  const email = String(auth.token.email).toLowerCase();
  if (email === PRIMARY_ADMIN) return email;

  const config = await db.doc('system/adminConfig').get();
  const admins = (config.data()?.emails || []).map(item => String(item).toLowerCase());
  if (!admins.includes(email)) {
    throw new HttpsError('permission-denied', '只有報修系統管理員可以使用地圖辨識。');
  }
  return email;
}

async function consumeQuota(uid, email) {
  const hour = currentHourKey();
  const usageRef = db.doc(`repair_api_usage/map_ocr_${uid}_${hour}`);

  const allowed = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(usageRef);
    const count = Number(snapshot.data()?.count || 0);
    if (!canConsumeQuota(count)) {
      transaction.set(usageRef, {
        blockedCount: Number(snapshot.data()?.blockedCount || 0) + 1,
        lastStatus: 'blocked',
        lastBlockedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      return false;
    }

    transaction.set(usageRef, {
      uid,
      email,
      hour,
      count: count + 1,
      lastStatus: 'started',
      lastRequestedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return true;
  });

  if (!allowed) {
    throw new HttpsError(
      'resource-exhausted',
      `本小時已使用 ${MAX_CALLS_PER_HOUR} 次辨識，請稍後再試。`
    );
  }
  return usageRef;
}

exports.repair_detectMapRooms = onCall({
  enforceAppCheck: false,
  timeoutSeconds: 60,
  memory: '512MiB'
}, async request => {
  const email = await assertRepairAdmin(request.auth);
  const validation = validateBase64Image(request.data?.base64Image);

  if (!validation.valid) {
    throw new HttpsError(
      'invalid-argument',
      validation.reason === 'size' ? '配置圖內容為空或超過 10MB 圖片限制。' : '配置圖編碼格式不正確。'
    );
  }

  const usageRef = await consumeQuota(request.auth.uid, email);
  const startedAt = Date.now();

  try {
    const [result] = await visionClient.textDetection({
      image: { content: Buffer.from(validation.base64Image, 'base64') }
    });
    await usageRef.set({
      lastStatus: 'success',
      lastDurationMs: Date.now() - startedAt,
      lastCompletedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return {
      textAnnotations: serializeAnnotations(result.textAnnotations || []),
      quotaLimit: MAX_CALLS_PER_HOUR
    };
  } catch (error) {
    await usageRef.set({
      lastStatus: 'failure',
      lastDurationMs: Date.now() - startedAt,
      lastError: String(error.message || 'unknown').slice(0, 200),
      lastCompletedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    console.error('repair_detectMapRooms failed', {
      uid: request.auth.uid,
      message: error.message
    });
    throw new HttpsError('internal', 'Google Vision 辨識暫時失敗，請稍後再試。');
  }
});
