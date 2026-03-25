export default defineEventHandler(() => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '0.1.0',
}))
