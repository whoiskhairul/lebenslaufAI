import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: '../', // Read .env from workspace root
  server: {
    port: 5173,
    host: true
  }
})
