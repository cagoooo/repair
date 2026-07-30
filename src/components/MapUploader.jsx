import { useEffect, useRef, useState } from 'react';
import { functions } from '../firebase';
import {
    blobToDataUrl,
    loadImageDimensions,
    openPdfFile,
    renderPdfPage,
    validateMapFile
} from '../services/mapFileService';
import { uploadMapFile } from '../services/mapUploadService';
import './MapUploader.css';

/**
 * 地圖上傳元件
 * 支援拖放上傳與點擊上傳
 */
function MapUploader({ onUpload, currentImage }) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const [pdfSession, setPdfSession] = useState(null);
    const [pdfPage, setPdfPage] = useState(1);
    const [pdfPreview, setPdfPreview] = useState(null);
    const [isRenderingPdf, setIsRenderingPdf] = useState(false);
    const [autoRehearsal, setAutoRehearsal] = useState(() => localStorage.getItem('repair_auto_map_rehearsal') === 'true');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => () => {
        pdfSession?.document?.destroy?.();
    }, [pdfSession]);

    // 處理拖放
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    };

    // 處理檔案選擇
    const handleFileSelect = (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
        e.target.value = '';
    };

    const uploadPreparedImage = async (imageBlob, imageName, metadata) => {
        setIsUploading(true);
        setUploadProgress(15);
        setUploadStatus('正在讀取與檢驗檔案格式…');
        try {
            setUploadProgress(30);
            setUploadStatus('正在轉換圖檔 Base64 數據…');
            const ocrDataUrl = metadata.ocrDataUrl || await blobToDataUrl(imageBlob);

            setUploadProgress(50);
            setUploadStatus('正在解析圖像解析度與尺寸…');
            const dimensions = await loadImageDimensions(ocrDataUrl);
            let sourceFilePath = '';

            if (functions) {
                setUploadProgress(70);
                setUploadStatus('正在將圖片儲存至雲端安全 Storage…');
                const uploadedImage = await uploadMapFile(imageBlob, imageName, 'image');

                if (metadata.sourceFile) {
                    try {
                        setUploadProgress(85);
                        setUploadStatus('正在上傳 PDF 原檔備查…');
                        const uploadedSource = await uploadMapFile(
                            metadata.sourceFile,
                            metadata.sourceFile.name,
                            'pdf'
                        );
                        sourceFilePath = uploadedSource.storagePath;
                    } catch (sourceError) {
                        console.warn('PDF 原檔未保存，但轉換圖片可繼續使用：', sourceError);
                    }
                }

                setUploadProgress(95);
                setUploadStatus('上傳完成！準備進入教室配置編輯與演練…');
                onUpload(uploadedImage.downloadURL, imageName, {
                    ...metadata,
                    autoRehearsal,
                    sourceFile: undefined,
                    sourceFilePath,
                    ...dimensions,
                    ocrDataUrl
                });
            } else {
                setUploadProgress(95);
                setUploadStatus('本地測試模式：使用 Data URL 載入…');
                console.warn('Firebase Storage 未啟用，使用本地 Data URL');
                onUpload(ocrDataUrl, imageName, {
                    ...metadata,
                    autoRehearsal,
                    sourceFile: undefined,
                    ...dimensions,
                    ocrDataUrl
                });
            }
            setUploadProgress(100);
            setPdfSession(null);
            setPdfPreview(null);
        } catch (err) {
            console.error('上傳失敗:', err);
            setError('上傳失敗：' + err.message);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            setUploadStatus('');
        }
    };

    const showPdfPage = async (session, pageNumber) => {
        setIsRenderingPdf(true);
        setError(null);
        try {
            const rendered = await renderPdfPage(session.document, pageNumber);
            setPdfPage(pageNumber);
            setPdfPreview(rendered);
        } catch (err) {
            setError('PDF 頁面轉換失敗：' + err.message);
        } finally {
            setIsRenderingPdf(false);
        }
    };

    // 處理檔案
    const handleFile = async (file) => {
        setError(null);
        const validation = validateMapFile(file);
        if (!validation.valid) {
            setError(validation.error);
            return;
        }

        if (validation.kind === 'pdf') {
            setIsRenderingPdf(true);
            try {
                const session = { ...(await openPdfFile(file)), sourceFile: file };
                setPdfSession(session);
                await showPdfPage(session, 1);
            } catch (err) {
                setError('PDF 讀取失敗：' + err.message);
            } finally {
                setIsRenderingPdf(false);
            }
            return;
        }

        await uploadPreparedImage(file, file.name, {
            type: 'image',
            sourceFileName: file.name,
            ocrDataUrl: await blobToDataUrl(file)
        });
    };

    const confirmPdfPage = async () => {
        if (!pdfSession || !pdfPreview) return;
        const baseName = pdfSession.fileName.replace(/\.pdf$/i, '');
        await uploadPreparedImage(pdfPreview.blob, `${baseName}_p${pdfPage}.png`, {
            type: 'pdf',
            sourceFile: pdfSession.sourceFile,
            sourceFileName: pdfSession.fileName,
            pageNumber: pdfPage,
            pageCount: pdfSession.pageCount,
            ocrDataUrl: pdfPreview.dataUrl
        });
    };

    const cancelPdf = () => {
        pdfSession?.document?.destroy?.();
        setPdfSession(null);
        setPdfPreview(null);
        setPdfPage(1);
    };

    return (
        <div className="map-uploader">
            {pdfSession && (
                <div className="pdf-page-picker" aria-live="polite">
                    <div className="pdf-page-header">
                        <div>
                            <strong>PDF 頁面預覽</strong>
                            <span>{pdfSession.fileName}</span>
                        </div>
                        <button type="button" className="btn btn-sm btn-secondary" onClick={cancelPdf} disabled={isUploading}>取消</button>
                    </div>
                    <div className="pdf-preview-frame">
                        {isRenderingPdf ? <span className="spinner"></span> : (
                            pdfPreview && <img src={pdfPreview.dataUrl} alt={`PDF 第 ${pdfPage} 頁預覽`} />
                        )}
                    </div>
                    <div className="pdf-page-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={pdfPage <= 1 || isRenderingPdf || isUploading}
                            onClick={() => showPdfPage(pdfSession, pdfPage - 1)}
                        >上一頁</button>
                        <span>第 {pdfPage} / {pdfSession.pageCount} 頁</span>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={pdfPage >= pdfSession.pageCount || isRenderingPdf || isUploading}
                            onClick={() => showPdfPage(pdfSession, pdfPage + 1)}
                        >下一頁</button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={!pdfPreview || isRenderingPdf || isUploading}
                            onClick={confirmPdfPage}
                        >{isUploading ? `處理中 (${uploadProgress}%)` : '使用這一頁'}</button>
                    </div>
                </div>
            )}

            {currentImage ? (
                <div className="current-image-container">
                    <img src={currentImage} alt="目前的教室配置圖" className="current-image" />
                    <div className={`image-overlay ${isUploading ? 'is-active-upload' : ''}`}>
                        {isUploading ? (
                            <div className="upload-progress-box">
                                <span className="upload-spin-icon">⏳</span>
                                <h4 className="upload-progress-title">更換圖檔處理中…</h4>
                                <p className="upload-progress-status">{uploadStatus}</p>
                                <div className="upload-progress-bar-track">
                                    <div
                                        className="upload-progress-bar-fill"
                                        style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                </div>
                                <span className="upload-progress-percent">{uploadProgress}%</span>
                            </div>
                        ) : (
                            <button
                                className="btn btn-secondary"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                📤 更換圖片
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div
                    className={`upload-zone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                >
                    <div className="upload-content">
                        {isUploading ? (
                            <div className="upload-progress-box">
                                <span className="upload-spin-icon">⏳</span>
                                <h4 className="upload-progress-title">更換圖檔上傳中…</h4>
                                <p className="upload-progress-status">{uploadStatus}</p>
                                <div className="upload-progress-bar-track">
                                    <div
                                        className="upload-progress-bar-fill"
                                        style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                </div>
                                <span className="upload-progress-percent">{uploadProgress}%</span>
                            </div>
                        ) : (
                            <>
                                <span className="upload-icon">📁</span>
                                <h3>上傳教室配置圖</h3>
                                <p>建議使用清晰 PNG／JPG，也可直接選擇 PDF</p>
                                <p className="upload-hint">支援 PDF、PNG、JPG、GIF、WebP（最大 10MB）</p>
                            </>
                        )}
                    </div>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/gif,image/webp,.pdf"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            <label className="auto-rehearsal-option">
                <input
                    type="checkbox"
                    checked={autoRehearsal}
                    onChange={event => {
                        const enabled = event.target.checked;
                        setAutoRehearsal(enabled);
                        localStorage.setItem('repair_auto_map_rehearsal', String(enabled));
                    }}
                />
                <span><strong>上傳後自動演練</strong><small>自動執行一次 OCR 並開啟差異報告，但絕不自動正式發布。</small></span>
            </label>

            {error && (
                <div className="upload-error">
                    ⚠️ {error}
                </div>
            )}
        </div>
    );
}

export default MapUploader;
