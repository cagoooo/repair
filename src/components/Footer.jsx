import React from 'react';
import './Footer.css';

/**
 * 頁尾元件
 * 整合了地圖圖例與版權資訊，支援 RWD 與 Aurora UI 視覺
 */
const Footer = () => {
    return (
        <footer className="footer-container">
            <div className="footer-aurora"></div>
            <div className="footer-content">
                <div className="footer-legend">
                    <div className="legend-item">
                        <span className="dot dot-normal"></span>
                        <span className="label">正常</span>
                    </div>
                    <div className="legend-item">
                        <span className="dot dot-pending"></span>
                        <span className="label">待維修</span>
                    </div>
                    <div className="legend-item">
                        <span className="dot dot-urgent"></span>
                        <span className="label">緊急</span>
                    </div>
                </div>

                <div className="footer-info">
                    <p className="copyright">
                        校園智慧報修系統 &copy; {new Date().getFullYear()} v0.6.0
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
