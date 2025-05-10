import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'
import { analyzer } from 'vite-bundle-analyzer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    analyzer({
      openAnalyzer: false,
    }),
  ],
  build: {
    target: 'esnext',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
  },
})
