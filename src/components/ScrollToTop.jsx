import { useState, useEffect } from 'react';
import './ScrollToTop.css'; // 我們稍後會建立這個 CSS

/**
 * 回到頂部按鈕元件
 * 當頁面捲動超過一定距離時顯示，點擊後平滑捲動回頂部
 */
function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);

    // 監聽捲動事件
    useEffect(() => {
        const toggleVisibility = () => {
            if (window.pageYOffset > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility);

        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    // 捲動到頂部
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    return (
        <div className={`scroll-to-top ${isVisible ? 'visible' : ''}`}>
            <button onClick={scrollToTop} className="scroll-btn" title="回到頂部">
                ↑
            </button>
        </div>
    );
}

export default ScrollToTop;
