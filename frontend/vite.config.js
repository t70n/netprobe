import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    host: '0.0.0.0', // Allow connections from any host
    proxy: {
      // Proxy API requests
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      // Proxy WebSocket connections
      '/socket.io': {
        target: 'http://localhost:8080', // Changed from ws:// to http://
        changeOrigin: true,
        ws: true,
        secure: false,
      },
    }
  }
})
