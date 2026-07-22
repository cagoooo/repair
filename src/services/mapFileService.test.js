import { describe, expect, it } from 'vitest';
import {
  MAP_FILE_MAX_BYTES,
  isPdfFile,
  validateMapFile
} from './mapFileService';

const file = (name, type, size = 100) => ({ name, type, size });

describe('mapFileService', () => {
  it('接受 PDF 與常用圖片格式', () => {
    expect(validateMapFile(file('map.pdf', 'application/pdf'))).toMatchObject({ valid: true, kind: 'pdf' });
    expect(validateMapFile(file('map.png', 'image/png'))).toMatchObject({ valid: true, kind: 'image' });
  });

  it('Windows 沒有 MIME 時仍可依副檔名辨識 PDF', () => {
    expect(isPdfFile(file('MAP.PDF', ''))).toBe(true);
  });

  it('拒絕不支援格式與超過共同限制的檔案', () => {
    expect(validateMapFile(file('map.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).valid).toBe(false);
    expect(validateMapFile(file('map.pdf', 'application/pdf', MAP_FILE_MAX_BYTES + 1)).valid).toBe(false);
  });
});
