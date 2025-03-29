// import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8007', // Assuming the proxy.py server runs on port 8001
        changeOrigin: true,
        secure: false
      }
    }
  }
})
