import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Characters', () => {
  test('navigate to characters page', async ({ page }) => {
    await registerAndLogin(page, 'Char Viewer')
    await createCampaign(page, `Char Camp ${uid()}`)

    await page.click('aside >> text=Characters')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText('Characters', { timeout: 10000 })
  })

  test('create character via API and view', async ({ page }) => {
    await registerAndLogin(page, 'Char Creator')
    await createCampaign(page, `Char View ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const charName = `Gandalf ${uid()}`
    await page.evaluate(async ([id, name]) => {
      await fetch(`/api/campaigns/${id}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, characterType: 'npc', race: 'Maiar', class: 'Wizard', content: '# Gandalf\n\nA wise wizard.' }),
      })
    }, [campaignId, charName])

    await page.click('aside >> text=Characters')
    await page.waitForLoadState('networkidle')
    await expect(page.locator(`main >> text=${charName}`)).toBeVisible({ timeout: 10000 })

    // Click to view detail
    await page.click(`main >> text=${charName}`)
    await page.waitForURL('**/characters/**', { timeout: 15000 })
    await expect(page.locator('main h1')).toContainText(charName, { timeout: 10000 })
  })

  test('character detail shows edit form and saves changes', async ({ page }) => {
    await registerAndLogin(page, 'Char Editor')
    await createCampaign(page, `Edit Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await page.evaluate(async (id) => {
      await fetch(`/api/campaigns/${id}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Editable NPC', characterType: 'npc', race: 'Elf', alignment: 'Neutral', content: '# Editable' }),
      })
    }, campaignId)

    await page.click('aside >> text=Characters')
    await page.waitForLoadState('networkidle')
    await page.click('main >> text=Editable NPC')
    await page.waitForURL('**/characters/**', { timeout: 15000 })
    await expect(page.locator('main h1')).toContainText('Editable NPC', { timeout: 10000 })

    // Click Edit → navigates to /edit page
    await page.click('[data-testid="edit-character"]')
    await expect(async () => {
      expect(page.url()).toContain('/edit')
    }).toPass({ timeout: 10000 })

    // Wait for edit form to load
    await expect(page.locator('input[placeholder*="Character name"]')).toBeVisible({ timeout: 10000 })

    // Change status to dead on the edit page form
    await page.selectOption('select:has(option[value="dead"])', 'dead')

    // Save
    await page.click('button[type="submit"]:has-text("Save")')
    await expect(async () => {
      const url = page.url()
      expect(url).toContain('/characters/')
      expect(url).not.toMatch(/\/edit$/)
    }).toPass({ timeout: 15000 })

    // Verify the status changed on detail page
    await expect(page.locator('main')).toContainText('dead', { timeout: 5000 })
  })

  test('PC/NPC filter toggle', async ({ page }) => {
    await registerAndLogin(page, 'Filter Tester')
    await createCampaign(page, `Filter Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await page.evaluate(async (id) => {
      await fetch(`/api/campaigns/${id}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'PC Hero', characterType: 'pc', content: '# Hero' }),
      })
      await fetch(`/api/campaigns/${id}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'NPC Villager', characterType: 'npc', content: '# Villager' }),
      })
    }, campaignId)

    await page.click('aside >> text=Characters')
    await page.waitForLoadState('networkidle')

    // Click PCs filter
    await page.click('main >> button:has-text("PCs")')
    await page.waitForTimeout(1000)
    await expect(page.locator('main >> text=PC Hero')).toBeVisible({ timeout: 5000 })

    // Click NPCs filter
    await page.click('main >> button:has-text("NPCs")')
    await page.waitForTimeout(1000)
    await expect(page.locator('main >> text=NPC Villager')).toBeVisible({ timeout: 5000 })
  })
})
