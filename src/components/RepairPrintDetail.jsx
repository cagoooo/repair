import React from 'react';
import QRCode from 'react-qr-code';
import { REPAIR_CATEGORIES, REPAIR_STATUS, REPAIR_PRIORITY } from '../data/repairCategories';

/**
 * 報修單列印元件
 * 僅在列印模式下顯示，或透過 CSS 控制顯示
 */
const RepairPrintDetail = ({ repair, comments = [] }) => {
    if (!repair) return null;

    // 格式化日期
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // 生成報修單連結 (Deep Link)
    // 假設首頁網址為 origin，並加上 ?repairId=
    const repairUrl = `${window.location.origin}/?repairId=${repair.id}`;

    return (
        <div className="print-container">
            <div className="print-header">
                <h1>🏫 校園報修單</h1>
                <div className="print-meta">
                    <span>單號：{repair.id.slice(0, 8).toUpperCase()}</span>
                    <span>列印日期：{new Date().toLocaleDateString('zh-TW')}</span>
                </div>
            </div>

            <div className="print-body">
                {/* 基本資料區 */}
                <div className="print-section">
                    <h3>📋 報修資訊</h3>
                    <table className="print-table">
                        <tbody>
                            <tr>
                                <th>申報時間</th>
                                <td>{formatDate(repair.createdAt)}</td>
                                <th>優先等級</th>
                                <td>{REPAIR_PRIORITY[repair.priority]?.name || repair.priority}</td>
                            </tr>
                            <tr>
                                <th>地點 (教室)</th>
                                <td colSpan="3">{repair.roomCode} - {repair.roomName}</td>
                            </tr>
                            <tr>
                                <th>類別</th>
                                <td>{REPAIR_CATEGORIES[repair.category]?.name || repair.category}</td>
                                <th>項目</th>
                                <td>{repair.itemName || repair.itemType}</td>
                            </tr>
                            <tr>
                                <th>申報人</th>
                                <td>{repair.reporterName}</td>
                                <th>聯絡方式</th>
                                <td>{repair.reporterContact || '無'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* 描述區 */}
                <div className="print-section description-section">
                    <h3>📝 問題描述</h3>
                    <div className="print-box content-box">
                        {repair.description}
                    </div>
                </div>

                {/* 照片區 (如果有圖片) */}
                {(repair.imageUrl || (repair.imageUrls && repair.imageUrls.length > 0)) && (
                    <div className="print-section photo-section">
                        <h3>📷 現場照片</h3>
                        <div className="print-photo-grid">
                            {repair.imageUrls && repair.imageUrls.length > 0 ? (
                                repair.imageUrls.map((url, idx) => (
                                    <div key={idx} className="print-photo-item">
                                        <img src={url} alt={`現場照片 ${idx + 1}`} />
                                    </div>
                                ))
                            ) : (
                                <div className="print-photo-item">
                                    <img src={repair.imageUrl} alt="現場照片" />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 處理備註區 */}
                {comments.length > 0 && (
                    <div className="print-section">
                        <h3>💬 處理備註 ({comments.length})</h3>
                        <div className="print-comments">
                            {comments.map((c, idx) => (
                                <div key={c.id || idx} className="print-comment-item">
                                    <div className="print-comment-header">
                                        <strong>{c.author || '管理員'}</strong>
                                        <span>{c.createdAt ? formatDate(c.createdAt) : ''}</span>
                                    </div>
                                    <p>{c.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 簽核區 (底部) */}
                <div className="print-footer-section">

                    {/* 左側：完工確認 */}
                    <div className="signature-block">
                        <h3>✅ 維修完成確認</h3>
                        <div className="signature-box">
                            <div className="sig-row">
                                <span>處理狀況：</span>
                                <span className="checkbox">□ 完成</span>
                                <span className="checkbox">□ 待料</span>
                                <span className="checkbox">□ 其他__________</span>
                            </div>
                            <div className="sig-row">
                                <span>完工日期： ____ 年 ____ 月 ____ 日</span>
                            </div>
                            <div className="sig-line">
                                <span>維修人員簽名：</span>
                                <div className="sig-underline"></div>
                            </div>
                            <div className="sig-line">
                                <span>驗收人簽名：</span>
                                <div className="sig-underline"></div>
                            </div>
                        </div>
                    </div>

                    {/* 右側：QR Code */}
                    <div className="qrcode-block">
                        <QRCode value={repairUrl} size={120} />
                        <span className="qrcode-label">掃描查看線上詳情</span>
                    </div>
                </div>
            </div>

            <div className="print-footer-text">
                校園報修系統 - 自動生成
            </div>
        </div>
    );
};

export default RepairPrintDetail;
