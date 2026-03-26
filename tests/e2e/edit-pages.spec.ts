import { test, expect } from '@playwright/test'
import { BASE, registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Edit Entity via /edit page (12.36)', () => {
  test('edit entity fields and verify changes persisted', async ({ page }) => {
    await registerAndLogin(page, 'EditEnt')
    await createCampaign(page, `EditEnt ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create entity via API
    const slug = await page.evaluate(async (id) => {
      const res = await fetch(`/api/campaigns/${id}/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Original Entity', type: 'note', content: '# Original', visibility: 'members' }),
      })
      return (await res.json()).slug
    }, campaignId)

    // Navigate to edit page
    await page.goto(`${BASE}/campaigns/${campaignId}/entities/${slug}/edit`)
    await page.waitForLoadState('networkidle')

    // Change name
    const nameInput = page.locator('input[placeholder="Entity name"]')
    await expect(nameInput).toBeVisible({ timeout: 10000 })
    await nameInput.fill('Updated Entity Name')

    // Change visibility
    await page.selectOption('select:has(option[value="dm_only"])', 'dm_only')

    // Submit
    await page.click('button:has-text("Save Changes")')
    await expect(async () => {
      expect(page.url()).toContain(`/entities/${slug}`)
      expect(page.url()).not.toContain('/edit')
    }).toPass({ timeout: 15000 })

    // Verify changes on detail page
    await expect(page.locator('main h1')).toContainText('Updated Entity Name', { timeout: 10000 })
    await expect(page.locator('main')).toContainText('dm_only')
  })
})

test.describe('Edit Character via /edit page (12.37)', () => {
  test('edit character fields and verify changes persisted', async ({ page }) => {
    await registerAndLogin(page, 'EditChar')
    await createCampaign(page, `EditChar ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create character via API
    const slug = await page.evaluate(async (id) => {
      const res = await fetch(`/api/campaigns/${id}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Original NPC', characterType: 'npc', race: 'Human', class: 'Fighter', alignment: 'Neutral', content: '# NPC' }),
      })
      return (await res.json()).slug
    }, campaignId)

    // Navigate to edit page
    await page.goto(`${BASE}/campaigns/${campaignId}/characters/${slug}/edit`)
    await page.waitForLoadState('networkidle')

    // Change race and alignment
    const raceInput = page.locator('input[placeholder*="Human, Elf"]')
    await expect(raceInput).toBeVisible({ timeout: 10000 })
    await raceInput.fill('Vampire')

    const alignInput = page.locator('input[placeholder*="Lawful Good"]')
    await alignInput.fill('Chaotic Evil')

    // Change status
    await page.selectOption('select:has(option[value="dead"])', 'dead')

    // Submit
    await page.click('button:has-text("Save Changes")')
    await expect(async () => {
      expect(page.url()).toContain(`/characters/${slug}`)
      expect(page.url()).not.toContain('/edit')
    }).toPass({ timeout: 15000 })

    // Verify changes on detail page
    await expect(page.locator('main')).toContainText('Vampire', { timeout: 10000 })
    await expect(page.locator('main')).toContainText('Chaotic Evil')
    await expect(page.locator('main')).toContainText('dead')
  })
})

test.describe('Edit Calendar via /edit page (12.38)', () => {
  test('edit calendar name and verify on detail', async ({ page }) => {
    await registerAndLogin(page, 'EditCal')
    await createCampaign(page, `EditCal ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create calendar via API
    const calId = await page.evaluate(async (id) => {
      const res = await fetch(`/api/campaigns/${id}/calendars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Old Calendar',
          configJson: JSON.stringify({ months: [{ name: 'Hammer', days: 30 }], yearLength: 30 }),
          currentYear: 1492, currentMonth: 1, currentDay: 1,
        }),
      })
      return (await res.json()).id
    }, campaignId)

    // Navigate to edit page
    await page.goto(`${BASE}/campaigns/${campaignId}/calendars/${calId}/edit`)
    await page.waitForLoadState('networkidle')

    // Change name
    const nameInput = page.locator('input[placeholder="Harptos Calendar"]')
    await expect(nameInput).toBeVisible({ timeout: 10000 })
    await nameInput.fill('Renamed Calendar')

    // Submit
    await page.click('button:has-text("Save Changes")')
    await expect(async () => {
      expect(page.url()).toContain(`/calendars/${calId}`)
      expect(page.url()).not.toContain('/edit')
    }).toPass({ timeout: 15000 })

    // Verify name changed on detail page
    await expect(page.locator('main h1')).toContainText('Renamed Calendar', { timeout: 10000 })
  })
})
