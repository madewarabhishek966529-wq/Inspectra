import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || process.env.VITE_BACKEND_URL || 'http://localhost:8080',
        changeOrigin: true
      },
      '/artifacts': {
        target: process.env.WORKER_URL || process.env.VITE_WORKER_URL || 'http://localhost:5001',
        changeOrigin: true
      }
    }
  }
});
