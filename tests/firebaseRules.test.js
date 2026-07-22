// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getBytes, ref, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const PROJECT_ID = 'demo-repair';
const BUCKET = `${PROJECT_ID}.appspot.com`;
let testEnv;

const repairPayload = {
  roomId: 'C101',
  roomCode: 'C101',
  roomName: '一年一班',
  category: 'IT',
  itemType: 'computer',
  description: '測試報修內容',
  priority: 'normal',
  reporterName: '測試者',
  status: 'pending',
  createdAt: '2026-07-22T00:00:00.000Z'
};

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(resolve('firestore.rules'), 'utf8') },
    storage: {
      rules: readFileSync(resolve('storage.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 9199
    }
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'system', 'adminConfig'), {
      emails: ['director@smes.tyc.edu.tw']
    });
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe('Firestore 共用規則回歸', () => {
  it('一般使用者能建立有效報修，但不能改地圖設定', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(publicDb, 'repairs', 'repair-1'), repairPayload));
    await assertFails(setDoc(doc(publicDb, 'system', 'mapConfig'), { rooms: [] }));
  });

  it('主要與動態管理員都能管理地圖版本', async () => {
    const primaryDb = testEnv.authenticatedContext('primary', {
      email: 'ipad@mail2.smes.tyc.edu.tw'
    }).firestore();
    const dynamicDb = testEnv.authenticatedContext('director', {
      email: 'director@smes.tyc.edu.tw'
    }).firestore();

    await assertSucceeds(setDoc(doc(primaryDb, 'system', 'mapConfig'), { rooms: [] }));
    await assertSucceeds(setDoc(doc(dynamicDb, 'system', 'mapConfig', 'versions', 'v1'), { revision: 1 }));
  });

  it('未登入者可讀地圖，但不能修改管理員名單', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(publicDb, 'system', 'mapConfig')));
    await assertFails(setDoc(doc(publicDb, 'system', 'adminConfig'), { emails: ['attacker@example.com'] }));
  });

  it('3D 畫廊仍維持擁有者寫入與公開展示權限', async () => {
    const ownerDb = testEnv.authenticatedContext('gallery-owner').firestore();
    const strangerDb = testEnv.authenticatedContext('gallery-stranger').firestore();
    await assertSucceeds(setDoc(doc(ownerDb, 'users', 'gallery-owner', 'profile', 'info'), { isPublic: true }));
    await assertSucceeds(setDoc(doc(ownerDb, 'users', 'gallery-owner', 'images', 'image-1'), { url: 'test' }));
    await assertSucceeds(getDoc(doc(strangerDb, 'users', 'gallery-owner', 'images', 'image-1')));
    await assertFails(setDoc(doc(strangerDb, 'users', 'gallery-owner', 'images', 'image-2'), { url: 'bad' }));
  });

  it('行政系統已登入使用者仍能建立行程', async () => {
    const staffDb = testEnv.authenticatedContext('staff-1').firestore();
    await assertSucceeds(setDoc(
      doc(staffDb, 'artifacts', 'default-app-id', 'public', 'data', 'school_events', 'event-1'),
      { title: '測試行程' }
    ));
  });
});

describe('Storage 共用規則回歸', () => {
  it('報修圖片可上傳，非圖片與超過 2MB 檔案會被拒絕', async () => {
    const publicStorage = testEnv.unauthenticatedContext().storage(BUCKET);
    await assertSucceeds(uploadBytes(
      ref(publicStorage, 'repair-images/valid.png'),
      new Uint8Array([1, 2, 3]),
      { contentType: 'image/png' }
    ));
    await assertFails(uploadBytes(
      ref(publicStorage, 'repair-images/not-image.txt'),
      new Uint8Array([1, 2, 3]),
      { contentType: 'text/plain' }
    ));
    await assertFails(uploadBytes(
      ref(publicStorage, 'repair-images/too-large.jpg'),
      new Uint8Array(2 * 1024 * 1024),
      { contentType: 'image/jpeg' }
    ));
  });

  it('新版地圖路徑禁止前端直寫，但正式圖片可公開讀取', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      await uploadBytes(
        ref(context.storage(BUCKET), 'repair-map/images/published.png'),
        new Uint8Array([1, 2, 3]),
        { contentType: 'image/png' }
      );
    });
    const publicStorage = testEnv.unauthenticatedContext().storage(BUCKET);
    const adminStorage = testEnv.authenticatedContext('director', {
      email: 'director@smes.tyc.edu.tw'
    }).storage(BUCKET);
    await assertSucceeds(getBytes(ref(publicStorage, 'repair-map/images/published.png')));
    await assertFails(uploadBytes(
      ref(adminStorage, 'repair-map/images/client-write.png'),
      new Uint8Array([1]),
      { contentType: 'image/png' }
    ));
  });

  it('舊版地圖路徑只允許主要管理員，確保相容但不擴權', async () => {
    const primaryStorage = testEnv.authenticatedContext('primary', {
      email: 'ipad@mail2.smes.tyc.edu.tw'
    }).storage(BUCKET);
    const dynamicStorage = testEnv.authenticatedContext('director', {
      email: 'director@smes.tyc.edu.tw'
    }).storage(BUCKET);
    await assertSucceeds(uploadBytes(
      ref(primaryStorage, 'map-images/legacy.png'),
      new Uint8Array([1]),
      { contentType: 'image/png' }
    ));
    await assertFails(uploadBytes(
      ref(dynamicStorage, 'map-images/legacy-denied.png'),
      new Uint8Array([1]),
      { contentType: 'image/png' }
    ));
  });
});
