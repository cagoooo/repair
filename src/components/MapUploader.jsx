import { useRef, useState } from 'react';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './MapUploader.css';

/**
 * 地圖上傳元件
 * 支援拖放上傳與點擊上傳
 */
function MapUploader({ onUpload, currentImage }) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

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
    };

    // 處理檔案
    const handleFile = async (file) => {
        setError(null);

        const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setError('不支援的檔案格式。請上傳 PNG, JPG, GIF, WebP。');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setError('檔案太大。請上傳小於 10MB 的檔案。');
            return;
        }

        setIsUploading(true);

        try {
            // 優先嘗試上傳到 Firebase Storage
            if (storage) {
                const storageRef = ref(storage, `map-images/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(storageRef);
                onUpload(downloadURL, file.name);
                setIsUploading(false);
            } else {
                // 降級：使用 Data URL (本地模式)
                console.warn('Firebase Storage 未啟用，使用本地 Data URL');
                const reader = new FileReader();
                reader.onload = (e) => {
                    onUpload(e.target.result, file.name);
                    setIsUploading(false);
                };
                reader.readAsDataURL(file);
            }
        } catch (err) {
            console.error('上傳失敗:', err);
            setError('上傳失敗：' + err.message);
            setIsUploading(false);
        }
    };

    return (
        <div className="map-uploader">
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
                                <p>拖放圖片到這裡，或點擊選擇檔案</p>
                                <p className="upload-hint">支援 PNG、JPG、GIF、WebP（最大 10MB）</p>
                            </>
                        )}
                    </div>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
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
