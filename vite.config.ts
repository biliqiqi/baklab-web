import react from '@vitejs/plugin-react'
import path from 'path'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// import { analyzer } from 'vite-bundle-analyzer'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: env.VITE_BASE_URL || '/',
    plugins: [
      react(),
      // analyzer({
      //   openAnalyzer: false,
      // }),
    ],
    build: {
      target: 'esnext',
      assetsInlineLimit: 0, // Disable base64 inlining for all assets
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
    },
    test: {
      environment: 'jsdom',
    },
  }
})
