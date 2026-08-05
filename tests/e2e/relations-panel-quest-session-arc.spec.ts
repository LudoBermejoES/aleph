import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-5)

test.describe('Relations panel — quest detail page', () => {
  test('panel renders and a relation to a character can be added', async ({ page }) => {
    await registerAndLogin(page, 'Quest Rel User')
    await createCampaign(page, `Quest Rel Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const quest = await apiFetch(page, `/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      body: { name: 'Find the Lost Sword', status: 'active' },
    })
    await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: 'Quest Giver', characterType: 'npc' },
    })
    const questSlug = (quest as Record<string, unknown>).slug as string
    const base = page.url().split('/campaigns/')[0]

    await page.goto(`${base}/campaigns/${campaignId}/quests/${questSlug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-testid="relations-panel"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main')).toContainText('No relations yet.', { timeout: 10000 })

    await page.click('[data-testid="relations-panel"] button:has-text("Add Relation")')
    await page.waitForSelector('[data-testid="relation-target-search"]', { timeout: 10000 })
    await page.fill('[data-testid="relation-target-search"]', 'Quest Giver')
    await expect(page.locator('button:has-text("Quest Giver")')).toBeVisible({ timeout: 10000 })
    await page.click('button:has-text("Quest Giver")')
    await page.locator('input[placeholder*="allies with"]').first().fill('assigned by')
    await page.click('[role="dialog"] button:has-text("Save")')

    await expect(page.locator('main')).toContainText('Quest Giver', { timeout: 20000 })
    await expect(page.locator('main')).toContainText('assigned by', { timeout: 5000 })
  })
})

test.describe('Relations panel — session detail page', () => {
  test('panel renders and a relation to a character can be added', async ({ page }) => {
    await registerAndLogin(page, 'Session Rel User')
    await createCampaign(page, `Session Rel Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const session = await apiFetch(page, `/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      body: { title: 'The Ambush at Dawn' },
    })
    await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: 'Session Hero', characterType: 'pc' },
    })
    const sessionSlug = (session as Record<string, unknown>).slug as string
    const base = page.url().split('/campaigns/')[0]

    await page.goto(`${base}/campaigns/${campaignId}/sessions/${sessionSlug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-testid="relations-panel"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main')).toContainText('No relations yet.', { timeout: 10000 })

    await page.click('[data-testid="relations-panel"] button:has-text("Add Relation")')
    await page.waitForSelector('[data-testid="relation-target-search"]', { timeout: 10000 })
    await page.fill('[data-testid="relation-target-search"]', 'Session Hero')
    await expect(page.locator('button:has-text("Session Hero")')).toBeVisible({ timeout: 10000 })
    await page.click('button:has-text("Session Hero")')
    await page.locator('input[placeholder*="allies with"]').first().fill('featured')
    await page.click('[role="dialog"] button:has-text("Save")')

    await expect(page.locator('main')).toContainText('Session Hero', { timeout: 20000 })
    await expect(page.locator('main')).toContainText('featured', { timeout: 5000 })
  })
})

test.describe('Relations panel — arc detail page', () => {
  test('panel renders and a relation to a character can be added', async ({ page }) => {
    await registerAndLogin(page, 'Arc Rel User')
    await createCampaign(page, `Arc Rel Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const arc = await apiFetch(page, `/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      body: { name: 'The Long Winter' },
    })
    await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: 'Arc Protagonist', characterType: 'pc' },
    })
    const arcSlug = (arc as Record<string, unknown>).slug as string
    const base = page.url().split('/campaigns/')[0]

    await page.goto(`${base}/campaigns/${campaignId}/arcs/${arcSlug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-testid="relations-panel"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main')).toContainText('No relations yet.', { timeout: 10000 })

    await page.click('[data-testid="relations-panel"] button:has-text("Add Relation")')
    await page.waitForSelector('[data-testid="relation-target-search"]', { timeout: 10000 })
    await page.fill('[data-testid="relation-target-search"]', 'Arc Protagonist')
    await expect(page.locator('button:has-text("Arc Protagonist")')).toBeVisible({
      timeout: 10000,
    })
    await page.click('button:has-text("Arc Protagonist")')
    await page.locator('input[placeholder*="allies with"]').first().fill('central to')
    await page.click('[role="dialog"] button:has-text("Save")')

    await expect(page.locator('main')).toContainText('Arc Protagonist', { timeout: 20000 })
    await expect(page.locator('main')).toContainText('central to', { timeout: 5000 })
  })
})
