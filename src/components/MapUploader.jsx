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
        try {
            const ocrDataUrl = metadata.ocrDataUrl || await blobToDataUrl(imageBlob);
            const dimensions = await loadImageDimensions(ocrDataUrl);
            let sourceFilePath = '';

            if (functions) {
                const uploadedImage = await uploadMapFile(imageBlob, imageName, 'image');

                if (metadata.sourceFile) {
                    try {
                        const uploadedSource = await uploadMapFile(
                            metadata.sourceFile,
                            metadata.sourceFile.name,
                            'pdf'
                        );
                        sourceFilePath = uploadedSource.storagePath;
                    } catch (sourceError) {
                        // PDF 原檔是選用備查；轉換後的正式圖片已成功上傳，不阻塞換圖流程。
                        console.warn('PDF 原檔未保存，但轉換圖片可繼續使用：', sourceError);
                    }
                }

                onUpload(uploadedImage.downloadURL, imageName, {
                    ...metadata,
                    sourceFile: undefined,
                    sourceFilePath,
                    ...dimensions,
                    ocrDataUrl
                });
            } else {
                console.warn('Firebase Storage 未啟用，使用本地 Data URL');
                onUpload(ocrDataUrl, imageName, {
                    ...metadata,
                    sourceFile: undefined,
                    ...dimensions,
                    ocrDataUrl
                });
            }
            setPdfSession(null);
            setPdfPreview(null);
        } catch (err) {
            console.error('上傳失敗:', err);
            setError('上傳失敗：' + err.message);
        } finally {
            setIsUploading(false);
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
                        <button type="button" className="btn btn-sm btn-secondary" onClick={cancelPdf}>取消</button>
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
                            disabled={pdfPage <= 1 || isRenderingPdf}
                            onClick={() => showPdfPage(pdfSession, pdfPage - 1)}
                        >上一頁</button>
                        <span>第 {pdfPage} / {pdfSession.pageCount} 頁</span>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={pdfPage >= pdfSession.pageCount || isRenderingPdf}
                            onClick={() => showPdfPage(pdfSession, pdfPage + 1)}
                        >下一頁</button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={!pdfPreview || isRenderingPdf || isUploading}
                            onClick={confirmPdfPage}
                        >{isUploading ? '上傳中…' : '使用這一頁'}</button>
                    </div>
                </div>
            )}

            {currentImage ? (
                <div className="current-image-container">
                    <img src={currentImage} alt="目前的教室配置圖" className="current-image" />
                    <div className="image-overlay">
                        <button
                            className="btn btn-secondary"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            📤 更換圖片
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    className={`upload-zone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="upload-content">
                        {isUploading ? (
                            <>
                                <span className="upload-icon animate-pulse">⏳</span>
                                <p>上傳中...</p>
                            </>
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

            {error && (
                <div className="upload-error">
                    ⚠️ {error}
                </div>
            )}
        </div>
    );
}

export default MapUploader;
