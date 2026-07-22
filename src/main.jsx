import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/Toast.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import ServiceWorkerUpdatePrompt from './components/ServiceWorkerUpdatePrompt.jsx'

// 🛡️ 全域未捕獲 Promise 錯誤處理
window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled Promise Rejection:', event.reason);
});

// 🛡️ 全域 JS 錯誤處理
window.addEventListener('error', (event) => {
  console.error('🚨 Global Error:', event.error);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
        <ServiceWorkerUpdatePrompt />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
)
