import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Allow Playwright (Node) to talk to services that use self-signed TLS certs.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envFile = process.env.E2E_ENV_FILE ?? '.env.backend.e2e'
dotenv.config({ path: path.resolve(__dirname, envFile), quiet: true })

const BASE_URL = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-US',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: `bash -c "set -a && source ${envFile} && set +a && npm run dev:test"`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
})
