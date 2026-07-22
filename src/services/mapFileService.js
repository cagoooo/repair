export const MAP_FILE_MAX_BYTES = 10 * 1024 * 1024;
export const MAP_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp'
]);

export function isPdfFile(file) {
  return file?.type === 'application/pdf' || /\.pdf$/i.test(file?.name || '');
}

export function validateMapFile(file) {
  if (!file) return { valid: false, error: '尚未選擇檔案' };
  const isImage = MAP_IMAGE_TYPES.has(file.type);
  const isPdf = isPdfFile(file);

  if (!isImage && !isPdf) {
    return { valid: false, error: '不支援的格式，請上傳 PDF、PNG、JPG、GIF 或 WebP。' };
  }
  if (file.size > MAP_FILE_MAX_BYTES) {
    return { valid: false, error: '檔案太大，請上傳 10MB 以下的檔案。' };
  }
  return { valid: true, kind: isPdf ? 'pdf' : 'image' };
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('讀取檔案失敗'));
    reader.readAsDataURL(blob);
  });
}

export function loadImageDimensions(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('無法讀取配置圖尺寸'));
    image.src = dataUrl;
  });
}

export async function imageSourceToOcrData(source) {
  if (!source) throw new Error('缺少 OCR 圖片來源');
  let dataUrl = source;

  if (!source.startsWith('data:')) {
    const response = await fetch(source, { cache: 'no-store' });
    if (!response.ok) throw new Error(`下載配置圖失敗（${response.status}）`);
    dataUrl = await blobToDataUrl(await response.blob());
  }

  const dimensions = await loadImageDimensions(dataUrl);
  const base64 = String(dataUrl).split(',')[1];
  if (!base64) throw new Error('配置圖內容格式不正確');
  return { dataUrl, base64, ...dimensions };
}

async function loadPdfJs() {
  const [pdfjs, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.mjs?url')
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
  return pdfjs;
}

export async function openPdfFile(file) {
  const validation = validateMapFile(file);
  if (!validation.valid || validation.kind !== 'pdf') {
    throw new Error(validation.error || '選擇的檔案不是 PDF');
  }

  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const pdfDocument = await loadingTask.promise;
  return {
    document: pdfDocument,
    pageCount: pdfDocument.numPages,
    fileName: file.name
  };
}

export async function renderPdfPage(pdfDocument, pageNumber, scale = 2) {
  if (!pdfDocument) throw new Error('PDF 尚未載入');
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pdfDocument.numPages) {
    throw new Error('PDF 頁碼超出範圍');
  }

  const page = await pdfDocument.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvasContext: context, viewport }).promise;

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(result => result ? resolve(result) : reject(new Error('PDF 轉換圖片失敗')), 'image/png');
  });
  const dataUrl = await blobToDataUrl(blob);

  return {
    blob,
    dataUrl,
    width: canvas.width,
    height: canvas.height,
    pageNumber,
    pageCount: pdfDocument.numPages
  };
}
