import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // sequential for auth tests
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'line',
  use: {
    baseURL: 'http://localhost:3333',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx nuxt dev --port 3333',
    port: 3333,
    reuseExistingServer: true, // use already-running dev server
    timeout: 30000,
  },
})
