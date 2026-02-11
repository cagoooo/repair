import { useState } from 'react';
import { REPAIR_CATEGORIES, REPAIR_PRIORITY } from '../data/repairCategories';
import { useToast } from './Toast';
import './RepairForm.css';

/**
 * 報修表單元件
 */
function RepairForm({ room, onSubmit, onClose }) {
    const toast = useToast();
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

    // 多圖上傳處理（最多 3 張）
    const MAX_IMAGES = 3;
    const [selectedImages, setSelectedImages] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const remaining = MAX_IMAGES - selectedImages.length;
        if (remaining <= 0) {
            toast.warning(`最多只能上傳 ${MAX_IMAGES} 張照片`);
            return;
        }

        const validFiles = [];
        for (const file of files.slice(0, remaining)) {
            if (!file.type.startsWith('image/')) {
                toast.warning(`「${file.name}」不是圖片檔案，已跳過`);
                continue;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.warning(`「${file.name}」超過 5MB 限制，已跳過`);
                continue;
            }
            validFiles.push(file);
        }

        if (validFiles.length) {
            setSelectedImages(prev => [...prev, ...validFiles]);
            setPreviewUrls(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))]);
        }
        // Reset input so same file can be re-selected
        e.target.value = '';
    };

    const handleRemoveImage = (index) => {
        URL.revokeObjectURL(previewUrls[index]);
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
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
            const imageUrls = [];

            // 上傳多張圖片到 Firebase Storage
            if (selectedImages.length > 0) {
                try {
                    const { storage } = await import('../utils/firebase');
                    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');

                    if (storage) {
                        for (const img of selectedImages) {
                            const storageRef = ref(storage, `repair-images/${Date.now()}_${img.name}`);
                            const snapshot = await uploadBytes(storageRef, img);
                            const url = await getDownloadURL(snapshot.ref);
                            imageUrls.push(url);
                            console.log('Image uploaded:', url);
                        }
                    } else {
                        console.warn('Firebase Storage not initialized');
                    }
                } catch (storageError) {
                    console.error('Storage upload failed:', storageError);
                    toast.warning(`部分圖片上傳失敗 (${storageError.code})，將繼續提交報修單。`);
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
                imageUrl: imageUrls[0] || null, // 向後兼容：保留第一張
                imageUrls: imageUrls, // 新增：多圖陣列
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
            previewUrls.forEach(url => URL.revokeObjectURL(url));
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

                    {/* 多圖上傳 */}
                    <div className="form-group">
                        <label className="form-label">現場照片 (選填，最多 {MAX_IMAGES} 張)</label>
                        <div className="image-upload-container multi">
                            <input
                                type="file"
                                id="repair-image"
                                accept="image/*"
                                multiple
                                onChange={handleImageChange}
                                style={{ display: 'none' }}
                            />
                            <div className="image-previews-grid">
                                {previewUrls.map((url, idx) => (
                                    <div key={idx} className="image-preview-item">
                                        <img src={url} alt={`Preview ${idx + 1}`} />
                                        <button
                                            type="button"
                                            className="remove-image-btn"
                                            onClick={() => handleRemoveImage(idx)}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                {selectedImages.length < MAX_IMAGES && (
                                    <label htmlFor="repair-image" className="image-upload-btn add-more">
                                        <div className="upload-placeholder">
                                            <span className="upload-icon">📷</span>
                                            <span>{selectedImages.length === 0 ? '上傳照片' : '新增'}</span>
                                        </div>
                                    </label>
                                )}
                            </div>
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
