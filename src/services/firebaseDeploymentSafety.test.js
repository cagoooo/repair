// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Firebase 共用專案部署邊界', () => {
  const config = JSON.parse(readFileSync('firebase.json', 'utf8'));

  it('Functions 使用獨立 codebase，避免刪除其他系統函式', () => {
    expect(config.functions).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'functions', codebase: 'repair-legacy' }),
      expect.objectContaining({ source: 'functions-map', codebase: 'repair-map' })
    ]));
  });

  it('預設部署設定不包含 companion 獨立資料庫', () => {
    expect(JSON.stringify(config)).not.toContain('companion');
  });

  it('Storage 與 Firestore 規則檔均明確指定', () => {
    expect(config.firestore.rules).toBe('firestore.rules');
    expect(config.storage.rules).toBe('storage.rules');
  });
});
