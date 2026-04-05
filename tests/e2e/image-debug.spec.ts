import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from '/Users/ludo/code/aleph/tests/e2e/helpers'

const uid = () => Date.now().toString(36).slice(-4)
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg==',
  'base64',
)

test('debug image upload', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (req) => {
    if (req.url().includes('/api/')) requests.push(`${req.method()} ${req.url()}`)
  })
  page.on('response', (res) => {
    if (res.url().includes('/api/')) requests.push(`  → ${res.status()} ${res.url()}`)
  })
  page.on('console', (msg) => {
    requests.push(`CONSOLE ${msg.type()}: ${msg.text()}`)
  })

  await registerAndLogin(page, `Img Debug ${uid()}`)
  await createCampaign(page, `Img Debug Camp ${uid()}`)
  const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
  const base = page.url().split('/campaigns/')[0]

  await page.goto(`${base}/campaigns/${campaignId}/characters/new`, {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 10000 })

  const imageBtn = page.locator('button[title="Insert Image"]')
  await expect(imageBtn).toBeVisible({ timeout: 10000 })

  // Try direct setInputFiles on hidden input
  const fileInput = page.locator('input[type="file"][accept*="image"]')
  console.log('File input count:', await fileInput.count())
  await fileInput.setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: TINY_PNG })

  await page.waitForTimeout(5000)
  console.log('Network requests:', requests.join('\n'))

  const imgCount = await page.locator('.ProseMirror img').count()
  console.log('Image count:', imgCount)
  const editorHtml = await page.locator('.ProseMirror').innerHTML()
  console.log('Editor HTML:', editorHtml.substring(0, 800))

  // Check console errors that happened during upload
  console.log('Console errors captured:', requests.filter((r) => r.includes('CONSOLE')).join('\n'))
})
