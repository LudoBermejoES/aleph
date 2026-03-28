import { test, expect, type Page } from '@playwright/test'
import { BASE, registerAndLogin, createCampaign } from './helpers'

let sharedPage: Page
let campaignPath: string

test.beforeAll(async ({ browser }) => {
  sharedPage = await browser.newPage()
  await registerAndLogin(sharedPage, 'Icon Tester')
  campaignPath = await createCampaign(sharedPage, `Icon Test ${Date.now().toString(36).slice(-4)}`)
})

test.afterAll(async () => {
  await sharedPage.close()
})

test('13.1 sidebar nav links each contain an svg icon', async () => {
  const page = sharedPage
  await page.goto(`${BASE}${campaignPath}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')

  // All nav links inside the sidebar should have an svg child
  const navLinks = page.locator('aside nav a')
  const count = await navLinks.count()
  expect(count).toBeGreaterThan(0)

  for (let i = 0; i < count; i++) {
    const link = navLinks.nth(i)
    const svg = link.locator('svg')
    await expect(svg.first()).toBeVisible({ timeout: 5000 })
  }
})

test('13.2 nav group headers each contain an svg icon', async () => {
  const page = sharedPage
  await page.goto(`${BASE}${campaignPath}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')

  // Group header buttons inside the sidebar should each have an svg
  const groupButtons = page.locator('aside nav button')
  const count = await groupButtons.count()
  expect(count).toBeGreaterThan(0)

  for (let i = 0; i < count; i++) {
    const btn = groupButtons.nth(i)
    await expect(btn.locator('svg').first()).toBeVisible({ timeout: 5000 })
  }
})

test('13.3 campaign dashboard cards each contain an svg icon', async () => {
  const page = sharedPage
  await page.goto(`${BASE}${campaignPath}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')

  // Every card link in the dashboard grid should contain an svg icon
  const cardLinks = page.locator('.grid > a')
  const count = await cardLinks.count()
  expect(count).toBeGreaterThanOrEqual(13)

  for (let i = 0; i < count; i++) {
    const card = cardLinks.nth(i)
    await expect(card.locator('svg').first()).toBeVisible({ timeout: 5000 })
  }
})
