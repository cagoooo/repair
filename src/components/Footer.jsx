import React from 'react';
import packageInfo from '../../package.json';
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
                        校園智慧報修系統 &copy; {new Date().getFullYear()} v{packageInfo.version}
                    </p>
                </div>
            </div>

            {/* 署名列（2026-11-17 新增） */}
            <div className="footer-credit-row">
                <p className="site-credit">
                    Made with <span className="site-credit__heart" aria-label="愛心">❤️</span> by{' '}
                    <a
                        href="https://cagoooo.github.io/Akai/"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="阿凱老師教育科技創新專區"
                        className="site-credit__author"
                    >
                        阿凱老師
                    </a>
                    <span className="site-credit__school">
                        <span className="site-credit__dot" aria-hidden="true">・</span>桃園市龍潭區石門國民小學
                    </span>
                </p>
            </div>
        </footer>
    );
};

export default Footer;
