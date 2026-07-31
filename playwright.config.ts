import { defineConfig } from '@playwright/test'

// Defaults to 3333 exactly as before. Overridable because another project's dev server on
// 3333 silently hijacks the run — see tests/e2e/helpers.ts. A non-default port also needs
// BETTER_AUTH_URL set to match (better-auth only trusts 3000, 3001 and 3333).
const PORT = Number(process.env.E2E_PORT || 3333)
const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // sequential for auth tests
  retries: process.env.CI ? 2 : 1, // 1 local retry handles ordering/load flakiness in full run
  workers: 1,
  timeout: 45000, // per-test timeout (default 30s is too tight for late-suite tests)
  reporter: process.env.CI ? 'github' : 'line',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    actionTimeout: 15000, // per-action timeout
  },
  webServer: {
    command: `npx nuxt dev --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI, // in CI always start fresh, locally reuse if running
    timeout: 120000, // 2 min for first Nuxt build
  },
})
