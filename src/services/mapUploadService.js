import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { blobToDataUrl } from './mapFileService';

export async function uploadMapFile(blob, fileName, kind = 'image') {
  if (!functions) throw new Error('Firebase Functions 尚未初始化');
  const dataUrl = await blobToDataUrl(blob);
  const base64File = String(dataUrl).split(',')[1];
  if (!base64File) throw new Error('無法讀取上傳檔案');

  const upload = httpsCallable(functions, 'repair_uploadMapFile', { timeout: 120000 });
  const result = await upload({
    base64File,
    fileName,
    kind,
    contentType: blob.type || (kind === 'pdf' ? 'application/pdf' : 'image/png')
  });
  return result.data;
}
