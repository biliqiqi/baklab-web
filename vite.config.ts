import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { Plugin, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// import { analyzer } from 'vite-bundle-analyzer'

const devSwMiddleware = (): Plugin => {
  return {
    name: 'dev-sw-middleware',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/dev-sw.js' || req.url === '/dev-sw.js?dev-sw') {
          const swPath = path.resolve(__dirname, 'dev-dist/sw.js')
          if (fs.existsSync(swPath)) {
            res.setHeader('Content-Type', 'text/javascript')
            res.setHeader('Service-Worker-Allowed', '/')
            const content = fs.readFileSync(swPath, 'utf-8')
            res.end(content)
            return
          }
        }
        if (req.url?.startsWith('/workbox-')) {
          const fileName = req.url.split('?')[0]
          const workboxPath = path.resolve(__dirname, 'dev-dist' + fileName)
          if (fs.existsSync(workboxPath)) {
            res.setHeader('Content-Type', 'text/javascript')
            const content = fs.readFileSync(workboxPath, 'utf-8')
            res.end(content)
            return
          }
        }
        next()
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: env.VITE_BASE_URL || '/',
    plugins: [
      devSwMiddleware(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        devOptions: {
          enabled: true,
          type: 'classic',
        },
        manifest: {
          name: env.VITE_BRAND_NAME,
          short_name: env.VITE_BRAND_NAME,
          description: 'A community platform',
          theme_color: '#1e73ca',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: '/android-chrome-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/android-chrome-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),
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
