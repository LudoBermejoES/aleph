import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Entity CRUD', () => {
  test('navigate to wiki and create entity', async ({ page }) => {
    await registerAndLogin(page, 'Entity Creator')
    await createCampaign(page, `Entity Camp ${uid()}`)

    await page.click('aside >> text=Wiki')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText('Entities', { timeout: 10000 })

    // Click New Entity → navigates to /entities/new
    await page.click('[data-testid="new-entity-btn"]')
    await expect(async () => { expect(page.url()).toContain('/entities/new') }).toPass({ timeout: 10000 })

    const entityName = `Strahd ${uid()}`
    await page.fill('input[placeholder="Entity name"]', entityName)

    // Submit
    await page.click('button:has-text("Create Entity")')

    // Should navigate to entity detail
    await expect(async () => {
      expect(page.url()).toMatch(/\/entities\/[^/]+$/)
      expect(page.url()).not.toContain('/new')
    }).toPass({ timeout: 15000 })
    await expect(page.locator('main h1')).toContainText(entityName, { timeout: 10000 })
  })

  test('entity detail renders markdown', async ({ page }) => {
    await registerAndLogin(page, 'MD Viewer')
    await createCampaign(page, `MD Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const entityName = `Barovia ${uid()}`
    await page.evaluate(async ([id, name]) => {
      await fetch(`/api/campaigns/${id}/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type: 'location',
          content: '# Barovia\n\nA **gloomy** village nestled in the valley.',
        }),
      })
    }, [campaignId, entityName])

    await page.click('aside >> text=Wiki')
    await page.waitForLoadState('networkidle')
    await page.click(`main >> text=${entityName}`)
    await page.waitForURL('**/entities/**', { timeout: 15000 })

    await expect(page.locator('main h1')).toContainText(entityName, { timeout: 10000 })
    await expect(page.locator('main strong:has-text("gloomy")')).toBeVisible({ timeout: 10000 })
  })

  test('search via Ctrl+K', async ({ page }) => {
    await registerAndLogin(page, 'Search User')
    await createCampaign(page, `Search Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const entityName = `Dragon ${uid()}`
    await page.evaluate(async ([id, name]) => {
      await fetch(`/api/campaigns/${id}/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: 'character', content: '# Dragon' }),
      })
    }, [campaignId, entityName])

    await page.click('aside >> text=Wiki')
    await page.waitForLoadState('networkidle')
    // Wait for search component to mount and register Ctrl+K handler
    await page.waitForTimeout(1000)

    await page.keyboard.press('Control+k')
    await page.waitForSelector('input[placeholder*="Search"]', { timeout: 10000 })
    await page.fill('input[placeholder*="Search"]', entityName.split(' ')[0])

    // Wait for debounced search + API response
    await page.waitForTimeout(2000)
    await expect(page.locator(`text=${entityName}`).first()).toBeVisible({ timeout: 10000 })
  })
})
