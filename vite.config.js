import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    port: 8080,              // Dışardan erişim için port
    host: true,              // Railway public host için gerekli
    allowedHosts: ['btk-demo-production.up.railway.app'] // Railway URL'ni buraya ekle
  }
})
