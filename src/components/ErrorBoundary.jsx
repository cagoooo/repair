import { Component } from 'react';
import './ErrorBoundary.css';

/**
 * 錯誤邊界元件
 * 捕獲子元件的 render 錯誤，防止整個 App 白屏
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        // 記錄錯誤到 console（未來可替換為 Sentry / Crashlytics）
        console.error('🚨 ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <div className="error-boundary-card">
                        <div className="error-icon">⚠️</div>
                        <h2>哎呀，系統發生了錯誤</h2>
                        <p className="error-message">
                            很抱歉造成不便。此錯誤已被記錄，請嘗試以下操作：
                        </p>
                        <div className="error-actions">
                            <button className="btn btn-primary" onClick={this.handleReload}>
                                🔄 重新整理頁面
                            </button>
                            <button className="btn btn-secondary" onClick={this.handleReset}>
                                ↩️ 嘗試恢復
                            </button>
                        </div>
                        {import.meta.env.DEV && this.state.error && (
                            <details className="error-details">
                                <summary>🔍 開發者資訊</summary>
                                <pre>{this.state.error.toString()}</pre>
                                {this.state.errorInfo && (
                                    <pre>{this.state.errorInfo.componentStack}</pre>
                                )}
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
