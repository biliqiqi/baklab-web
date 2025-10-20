import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { Plugin, loadEnv } from 'vite'
// import { analyzer } from 'vite-bundle-analyzer'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

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
      legacy({
        targets: ['Chrome >= 87', 'Edge >= 88', 'Safari >= 13'],
        modernTargets: ['Chrome >= 87', 'Edge >= 88', 'Safari >= 13'],
        modernPolyfills: true,
        renderLegacyChunks: false,
      }),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        devOptions: {
          enabled: true,
          type: 'classic',
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
          navigateFallback: null,
          inlineWorkboxRuntime: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
        manifest: {
          name: env.VITE_BRAND_NAME,
          short_name: env.VITE_BRAND_NAME,
          description: 'A community platform',
          theme_color: '#1e73ca',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: `/${env.VITE_BASE_URL}/android-chrome-192x192.png`.replace(
                '//',
                '/'
              ),
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: `/${env.VITE_BASE_URL}/android-chrome-512x512.png`.replace(
                '//',
                '/'
              ),
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),
      react(),
      // analyzer({
      //   openAnalyzer: true,
      // }),
    ],
    build: {
      assetsInlineLimit: 0,
      target: 'es2015',
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
