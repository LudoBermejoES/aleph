import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    dir: 'tests',
    include: ['**/*.test.ts'],
    exclude: ['tests/e2e/**'],
  },
})
