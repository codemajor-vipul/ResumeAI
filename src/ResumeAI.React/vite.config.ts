import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Proxy all /api/* calls to the YARP gateway — no CORS issues in dev
    proxy: {
      '/api': {
        target: 'http://localhost:5115',
        changeOrigin: true,
      },
      '/hubs': {
        target: 'http://localhost:5008',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
