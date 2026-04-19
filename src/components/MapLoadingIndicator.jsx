import { useEffect, useState } from 'react';
import './MapLoadingIndicator.css';

/**
 * 地圖載入中指示器
 * 首次進入或重新整理時顯示動畫進度條，避免使用者誤以為網頁當掉
 */
const MapLoadingIndicator = () => {
    const [progress, setProgress] = useState(8);
    const [stage, setStage] = useState('正在連線雲端資料庫...');

    useEffect(() => {
        // 模擬進度：前 60% 較快，之後慢慢接近 95%（避免到 100% 後還沒好）
        let current = 8;
        const stages = [
            { at: 15, text: '正在連線雲端資料庫...' },
            { at: 35, text: '正在載入教室配置圖...' },
            { at: 60, text: '正在讀取報修資料...' },
            { at: 80, text: '即將完成，請稍候...' },
            { at: 95, text: '整理中...' },
        ];

        const interval = setInterval(() => {
            if (current >= 95) {
                clearInterval(interval);
                return;
            }
            // 越接近 95% 越慢
            const step = current < 40 ? 4 : current < 70 ? 2.5 : current < 85 ? 1.2 : 0.5;
            current = Math.min(95, current + step);
            setProgress(current);

            // 更新階段文字
            const matched = stages.reverse().find(s => current >= s.at);
            stages.reverse();
            if (matched) setStage(matched.text);
        }, 120);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="map-loading-container animate-fadeIn">
            <div className="map-loading-card glass-card">
                <div className="map-loading-icon">
                    <span className="loading-building">🏫</span>
                    <span className="loading-pin">📍</span>
                </div>

                <h3 className="map-loading-title">載入教室配置圖</h3>
                <p className="map-loading-stage">{stage}</p>

                <div className="map-loading-progress-wrapper">
                    <div
                        className="map-loading-progress-bar"
                        style={{ width: `${progress}%` }}
                    >
                        <div className="progress-shimmer"></div>
                    </div>
                </div>
                <div className="map-loading-percent">{Math.floor(progress)}%</div>

                <div className="map-loading-tips">
                    <span className="tip-icon">💡</span>
                    <span>首次載入可能需要數秒，請稍候不要重新整理</span>
                </div>
            </div>
        </div>
    );
};

export default MapLoadingIndicator;
