import { useState } from 'react';
import { REPAIR_CATEGORIES, REPAIR_PRIORITY } from '../data/repairCategories';
import './RepairForm.css';

/**
 * 報修表單元件
 */
function RepairForm({ room, onSubmit, onClose }) {
    const [formData, setFormData] = useState({
        category: '',
        itemType: '',
        description: '',
        priority: 'normal',
        reporterName: '',
        reporterContact: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 取得當前類別的項目列表
    const getItems = () => {
        if (!formData.category) return [];
        return REPAIR_CATEGORIES[formData.category]?.items || [];
    };

    // 處理表單變更
    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
            // 切換類別時清空項目選擇
            ...(field === 'category' ? { itemType: '' } : {})
        }));

        // 清除該欄位的錯誤
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    // 驗證表單
    const validateForm = () => {
        const newErrors = {};

        if (!formData.category) {
            newErrors.category = '請選擇報修類別';
        }
        if (!formData.itemType) {
            newErrors.itemType = '請選擇報修項目';
        }
        if (!formData.description.trim()) {
            newErrors.description = '請描述問題狀況';
        }
        if (!formData.reporterName.trim()) {
            newErrors.reporterName = '請填寫申報人姓名';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 圖片上傳處理
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 驗證檔案類型
        if (!file.type.startsWith('image/')) {
            alert('請選擇圖片檔案 (JPG, PNG, WebP)');
            return;
        }

        // 驗證檔案大小 (最大 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('圖片大小不能超過 5MB');
            return;
        }

        setSelectedImage(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    // 提交表單
    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Submit button clicked with formData:', formData);

        if (!validateForm()) {
            console.log('Validation failed', validateForm());
            return;
        }

        setIsSubmitting(true);
        console.log('Submitting repair...');

        try {
            let imageUrl = null;

            // 上傳圖片到 Firebase Storage
            if (selectedImage) {
                try {
                    const { storage } = await import('../utils/firebase');
                    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');

                    if (storage) {
                        const storageRef = ref(storage, `repair-images/${Date.now()}_${selectedImage.name}`);
                        const snapshot = await uploadBytes(storageRef, selectedImage);
                        imageUrl = await getDownloadURL(snapshot.ref);
                        console.log('Image uploaded successfully:', imageUrl);
                    } else {
                        console.warn('Firebase Storage not initialized');
                    }
                } catch (storageError) {
                    console.error('Storage upload failed:', storageError);
                    alert(`圖片上傳失敗 (${storageError.code})，將繼續提交報修單。`);
                    // Don't block submission if image fails, just continue without image
                }
            }

            const repairData = {
                roomId: room.id,
                roomCode: room.code,
                roomName: room.name,
                category: formData.category,
                itemType: formData.itemType,
                itemName: getItems().find(i => i.id === formData.itemType)?.name || '',
                description: formData.description.trim(),
                priority: formData.priority,
                reporterName: formData.reporterName.trim(),
                reporterContact: formData.reporterContact.trim(),
                imageUrl: imageUrl, // 新增圖片連結
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await onSubmit(repairData);
        } catch (error) {
            console.error('提交報修失敗:', error);
            setErrors({ submit: '提交失敗，請稍後再試: ' + error.message });
        } finally {
            setIsSubmitting(false);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        }
    };

    // Convert hex to rgb for CSS transparency
    const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `${r}, ${g}, ${b}`;
    };

    return (
        <div className="repair-form-overlay" onClick={onClose}>
            <div className="repair-form-container glass-card" onClick={(e) => e.stopPropagation()}>
                <div className="repair-form-header">
                    <div>
                        <h2>📝 報修申請</h2>
                        <p className="room-info">
                            <span className="room-badge">{room.code}</span>
                            {room.name}
                        </p>
                    </div>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className="repair-form">
                    {/* 報修類別 */}
                    <div className="form-group">
                        <label className="form-label">報修類別 *</label>
                        <div className="category-buttons">
                            {Object.values(REPAIR_CATEGORIES).map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    className={`category-btn ${formData.category === cat.id ? 'active' : ''}`}
                                    style={{
                                        '--cat-color': cat.color,
                                        '--cat-color-rgb': hexToRgb(cat.color)
                                    }}
                                    onClick={() => handleChange('category', cat.id)}
                                >
                                    <span className="cat-icon">{cat.icon}</span>
                                    <span className="cat-name">{cat.name}</span>
                                </button>
                            ))}
                        </div>
                        {errors.category && <span className="error-msg">{errors.category}</span>}
                    </div>

                    {/* 報修項目 */}
                    {formData.category && (
                        <div className="form-group animate-fadeIn">
                            <label className="form-label">報修項目 *</label>
                            <div className="item-grid">
                                {getItems().map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={`item-btn ${formData.itemType === item.id ? 'active' : ''}`}
                                        onClick={() => handleChange('itemType', item.id)}
                                    >
                                        <span className="item-icon">{item.icon}</span>
                                        <span className="item-name">{item.name}</span>
                                    </button>
                                ))}
                            </div>
                            {errors.itemType && <span className="error-msg">{errors.itemType}</span>}
                        </div>
                    )}

                    {/* 問題描述 */}
                    <div className="form-group">
                        <label className="form-label">問題描述 *</label>
                        <textarea
                            className="form-textarea"
                            placeholder="請詳細說明故障狀況，例如：電腦開機後無法進入桌面，一直卡在載入畫面..."
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            rows={4}
                        />
                        {errors.description && <span className="error-msg">{errors.description}</span>}
                    </div>

                    {/* 優先順序 */}
                    <div className="form-group">
                        <label className="form-label">緊急程度</label>
                        <div className="priority-buttons">
                            {Object.values(REPAIR_PRIORITY).map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    className={`priority-btn ${formData.priority === p.id ? 'active' : ''}`}
                                    style={{ '--priority-color': p.color }}
                                    onClick={() => handleChange('priority', p.id)}
                                >
                                    <span>{p.icon}</span>
                                    <span>{p.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 申報人資訊 */}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">申報人姓名 *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="例如：王老師"
                                value={formData.reporterName}
                                onChange={(e) => handleChange('reporterName', e.target.value)}
                            />
                            {errors.reporterName && <span className="error-msg">{errors.reporterName}</span>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">聯絡方式</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="例如：分機 123"
                                value={formData.reporterContact}
                                onChange={(e) => handleChange('reporterContact', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* 圖片上傳 */}
                    <div className="form-group">
                        <label className="form-label">現場照片 (選填)</label>
                        <div className="image-upload-container">
                            <input
                                type="file"
                                id="repair-image"
                                accept="image/*"
                                onChange={handleImageChange}
                                style={{ display: 'none' }}
                            />
                            <label htmlFor="repair-image" className="image-upload-btn">
                                {previewUrl ? (
                                    <div className="image-preview">
                                        <img src={previewUrl} alt="Preview" />
                                        <div className="image-overlay">
                                            <span>更換照片</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="upload-placeholder">
                                        <span className="upload-icon">📷</span>
                                        <span>上傳照片</span>
                                    </div>
                                )}
                            </label>
                            {selectedImage && (
                                <button
                                    type="button"
                                    className="remove-image-btn"
                                    onClick={() => {
                                        setSelectedImage(null);
                                        setPreviewUrl(null);
                                        URL.revokeObjectURL(previewUrl);
                                    }}
                                >
                                    ✕ 移除
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 錯誤訊息 */}
                    {errors.submit && (
                        <div className="submit-error">
                            ⚠️ {errors.submit}
                        </div>
                    )}

                    {/* 提交按鈕 */}
                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? '提交中...' : '📤 提交報修'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default RepairForm;
