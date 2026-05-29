import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // sequential for auth tests
  retries: process.env.CI ? 2 : 1, // 1 local retry handles ordering/load flakiness in full run
  workers: 1,
  timeout: 45000, // per-test timeout (default 30s is too tight for late-suite tests)
  reporter: process.env.CI ? 'github' : 'line',
  use: {
    baseURL: 'http://localhost:3333',
    trace: 'on-first-retry',
    actionTimeout: 15000, // per-action timeout
  },
  webServer: {
    command: 'npx nuxt dev --port 3333',
    port: 3333,
    reuseExistingServer: !process.env.CI, // in CI always start fresh, locally reuse if running
    timeout: 120000, // 2 min for first Nuxt build
  },
})
