import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/repair/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Firebase SDK 獨立分包
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/storage'],
          // XLSX 獨立分包（大型依賴）
          xlsx: ['xlsx'],
          // React 核心
          vendor: ['react', 'react-dom']
        }
      }
    }
  }
})
