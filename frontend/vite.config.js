import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Cho phép truy cập từ LAN
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    // Minify code để bảo vệ và giảm kích thước
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Loại bỏ console.log trong production
        drop_debugger: true, // Loại bỏ debugger statements
        pure_funcs: ['console.info', 'console.debug', 'console.warn'] // Loại bỏ các console functions khác
      },
      mangle: {
        // Làm rối tên biến để khó đọc
        safari10: true
      }
    },
    // Tắt source map trong production để bảo vệ code
    sourcemap: false,
    // Code splitting để tối ưu performance
    rollupOptions: {
      output: {
        // Chia code thành các chunks riêng biệt
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
          'ui-vendor': ['react-icons', 'swiper', 'react-toastify', 'lucide-react'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'yup']
        },
        // Đặt tên file với hash để cache busting
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    },
    // Tăng chunk size warning limit
    chunkSizeWarningLimit: 1000
  }
})
