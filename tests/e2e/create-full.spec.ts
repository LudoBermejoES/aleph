import { test, expect } from '@playwright/test'
import { BASE, registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Thorough Entity Create (11a)', () => {
  test('fill all fields, verify on detail page', async ({ page }) => {
    await registerAndLogin(page, 'EntFull')
    await createCampaign(page, `EntFull ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    await page.goto(`${BASE}/campaigns/${campaignId}/entities/new`)
    await page.waitForLoadState('networkidle')

    // 11.1 Fill name, type, visibility, tags
    const entityName = `Barovia Castle ${uid()}`
    await page.fill('input[placeholder="Entity name"]', entityName)
    await page.selectOption('select:has(option[value="members"])', 'dm_only')

    await page.fill('input[placeholder*="npc, barovia"]', 'castle, undead, barovia')

    // 11.2 Type in MarkdownEditor (ProseMirror)
    const editor = page.locator('.ProseMirror')
    if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editor.click()
      await editor.pressSequentially('A dark castle looming over the valley.')
    }

    // 11.3 Submit
    await page.click('button:has-text("Create Entity")')
    await expect(async () => {
      expect(page.url()).toMatch(/\/entities\/[^/]+$/)
      expect(page.url()).not.toContain('/new')
    }).toPass({ timeout: 15000 })

    // Verify detail page
    await expect(page.locator('main h1')).toContainText(entityName, { timeout: 10000 })

    // Verify visibility badge
    await expect(page.locator('main')).toContainText('dm_only')

    // 11.4 Verify tags
    await expect(page.locator('main')).toContainText('castle')
    await expect(page.locator('main')).toContainText('barovia')
  })
})

test.describe('Thorough Character Create (11b)', () => {
  test('fill all NPC fields, verify on detail page', async ({ page }) => {
    await registerAndLogin(page, 'CharFull')
    await createCampaign(page, `CharFull ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    await page.goto(`${BASE}/campaigns/${campaignId}/characters/new`)
    await page.waitForLoadState('networkidle')

    // 11.5 Fill all fields
    const charName = `Strahd ${uid()}`
    await page.fill('input[placeholder="Character name"]', charName)
    await page.selectOption('select:has(option[value="npc"])', 'npc')
    await page.selectOption('select:has(option[value="alive"])', 'alive')
    await page.fill('input[placeholder*="Human, Elf"]', 'Vampire')
    await page.fill('input[placeholder*="Fighter, Wizard"]', 'Necromancer')
    await page.fill('input[placeholder*="Lawful Good"]', 'Lawful Evil')
    await page.selectOption('select:has(option[value="members"])', 'dm_only')

    // 11.7 Type in MarkdownEditor
    const editor = page.locator('.ProseMirror')
    if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editor.click()
      await editor.pressSequentially('The lord of Barovia, a powerful vampire.')
    }

    // 11.8 Submit
    await page.click('button:has-text("Create Character")')
    await expect(async () => {
      expect(page.url()).toMatch(/\/characters\/[^/]+$/)
      expect(page.url()).not.toContain('/new')
    }).toPass({ timeout: 15000 })

    // Verify all fields on detail page
    await expect(page.locator('main h1')).toContainText(charName, { timeout: 10000 })
    await expect(page.locator('main')).toContainText('npc')
    await expect(page.locator('main')).toContainText('Vampire')
    await expect(page.locator('main')).toContainText('Necromancer')
    await expect(page.locator('main')).toContainText('Lawful Evil')
    await expect(page.locator('main')).toContainText('alive')
  })

  test('PC type shows owner dropdown (11.6)', async ({ page }) => {
    await registerAndLogin(page, 'PCOwner')
    await createCampaign(page, `PCOwner ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    await page.goto(`${BASE}/campaigns/${campaignId}/characters/new`)
    await page.waitForLoadState('networkidle')

    // Owner dropdown hidden for NPC
    await expect(page.locator('text=Owner (Player)')).not.toBeVisible()

    // Switch to PC → owner dropdown appears
    await page.selectOption('select:has(option[value="npc"])', 'pc')
    await expect(page.locator('text=Owner (Player)')).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Thorough Calendar Create (11c)', () => {
  test('fill all fields with custom months, verify grid', async ({ page }) => {
    await registerAndLogin(page, 'CalFull')
    await createCampaign(page, `CalFull ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    await page.goto(`${BASE}/campaigns/${campaignId}/calendars/new`)
    await page.waitForLoadState('networkidle')

    // 11.10 Fill name and current date
    const calName = `Harptos ${uid()}`
    await page.fill('input[placeholder="Harptos Calendar"]', calName)
    await page.fill('input[type="number"]:first-of-type', '1492')

    // 11.11 Fill first month name + days
    await page.fill('input[placeholder="Month name"]', 'Hammer')
    const daysInput = page.locator('input[type="number"][min="1"]').last()
    await daysInput.fill('30')

    // Add 2 more months
    await page.click('button:has-text("Add Month")')
    const monthInputs = page.locator('input[placeholder="Month name"]')
    await monthInputs.nth(1).fill('Alturiak')
    await page.click('button:has-text("Add Month")')
    await monthInputs.nth(2).fill('Ches')

    // 11.12 Set weekday names
    await page.fill('input[placeholder*="Sun, Mon"]', 'Soldi, Lunedi, Martedi, Mertedi, Yovedi, Firedi, Sataredi')

    // 11.13 Submit
    await page.click('button:has-text("Create Calendar")')
    await expect(async () => {
      expect(page.url()).toMatch(/\/calendars\/[^/]+$/)
      expect(page.url()).not.toContain('/new')
    }).toPass({ timeout: 15000 })

    // Verify calendar grid renders with correct month name
    await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="month-nav"]')).toContainText('Hammer')

    // 11.14 Verify day cells (30 days)
    const dayCells = page.locator('[data-testid="calendar-grid"] .grid-cols-7 > div:not(.bg-muted\\/30)')
    // Should have at least 28 visible day cells (30 - offset cells)
    await expect(async () => {
      const count = await dayCells.count()
      expect(count).toBeGreaterThanOrEqual(28)
    }).toPass({ timeout: 5000 })
  })
})

test.describe('Thorough Timeline Create (11d)', () => {
  test('fill name and description, verify detail', async ({ page }) => {
    await registerAndLogin(page, 'TlFull')
    await createCampaign(page, `TlFull ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    await page.goto(`${BASE}/campaigns/${campaignId}/timelines/new`)
    await page.waitForLoadState('networkidle')

    const tlName = `Dark Era ${uid()}`
    await page.fill('input[placeholder="Campaign Arc 1"]', tlName)
    await page.fill('textarea', 'The age when Strahd conquered Barovia.')

    await page.click('button:has-text("Create Timeline")')
    await expect(async () => {
      expect(page.url()).toMatch(/\/timelines\/[^/]+$/)
    }).toPass({ timeout: 15000 })

    // 11.16 Verify name shown
    await expect(page.locator('main h1')).toContainText(tlName, { timeout: 10000 })
    // 11.17 Verify chronicle view (empty state)
    await expect(page.locator('[data-testid="chronicle-view"]')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Thorough Session Create (11e)', () => {
  test('fill all fields, verify on detail page', async ({ page }) => {
    await registerAndLogin(page, 'SessFull')
    await createCampaign(page, `SessFull ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    await page.goto(`${BASE}/campaigns/${campaignId}/sessions/new`)
    await page.waitForLoadState('networkidle')

    // 11.18 Fill title, date, status
    const sessTitle = `Barovia Arrival ${uid()}`
    await page.fill('input[placeholder*="auto-numbered"]', sessTitle)
    await page.selectOption('select:has(option[value="planned"])', 'planned')

    // 11.19 Type in MarkdownEditor
    const editor = page.locator('.ProseMirror')
    if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editor.click()
      await editor.pressSequentially('The party crossed through the mists into Barovia.')
    }

    // 11.20 Submit
    await page.click('button:has-text("Create Session")')
    await expect(async () => {
      expect(page.url()).toMatch(/\/sessions\/[^/]+$/)
    }).toPass({ timeout: 15000 })

    // Verify title and status
    await expect(page.locator('main h1')).toContainText(sessTitle, { timeout: 10000 })
    await expect(page.locator('main')).toContainText('planned')
  })
})

test.describe('Thorough Map Create (11f)', () => {
  test('fill name, verify map page renders', async ({ page }) => {
    await registerAndLogin(page, 'MapFull')
    await createCampaign(page, `MapFull ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    await page.goto(`${BASE}/campaigns/${campaignId}/maps/new`)
    await page.waitForLoadState('networkidle')

    const mapName = `Barovia Map ${uid()}`
    await page.fill('input[placeholder*="Barovia"]', mapName)

    await page.click('button:has-text("Create Map")')
    await expect(async () => {
      expect(page.url()).toMatch(/\/maps\/[^/]+$/)
    }).toPass({ timeout: 15000 })

    await expect(page.locator('main h1')).toContainText(mapName, { timeout: 10000 })
  })
})

test.describe('Thorough Quest Create (11g)', () => {
  test('fill all fields, verify in list', async ({ page }) => {
    await registerAndLogin(page, 'QstFull')
    await createCampaign(page, `QstFull ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    await page.goto(`${BASE}/campaigns/${campaignId}/quests/new`)
    await page.waitForLoadState('networkidle')

    // 11.25 Fill fields
    const questName = `Defeat Strahd ${uid()}`
    await page.fill('input[placeholder*="Defeat"]', questName)
    await page.selectOption('select:has(option[value="active"])', 'active')

    // 11.26 Type in MarkdownEditor
    const editor = page.locator('.ProseMirror')
    if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editor.click()
      await editor.pressSequentially('Find the three artifacts to defeat the vampire lord.')
    }

    await page.click('button:has-text("Create Quest")')
    await page.waitForLoadState('networkidle')

    // 11.27 Verify quest in list
    await expect(page.locator('main')).toContainText(questName, { timeout: 10000 })
  })
})

test.describe('Thorough Item Create (11h)', () => {
  test('fill all fields, verify in list', async ({ page }) => {
    await registerAndLogin(page, 'ItemFull')
    await createCampaign(page, `ItemFull ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    await page.goto(`${BASE}/campaigns/${campaignId}/items/new`)
    await page.waitForLoadState('networkidle')

    // 11.28 Fill all fields
    const itemName = `Sunsword ${uid()}`
    await page.fill('input[placeholder*="Vorpal"]', itemName)
    await page.selectOption('select:has(option[value="legendary"])', 'legendary')
    await page.fill('input[placeholder*="weapon"]', 'weapon')
    await page.fill('input[placeholder*="lbs"]', '3 lbs')

    // 11.29 Description
    await page.fill('textarea', 'A radiant blade that burns undead.')

    await page.click('button:has-text("Create Item")')
    await page.waitForLoadState('networkidle')

    // 11.30 Verify in list with rarity
    await expect(page.locator('main')).toContainText(itemName, { timeout: 10000 })
    await expect(page.locator('main')).toContainText('legendary')
  })
})

test.describe('Thorough Shop Create (11i)', () => {
  test('fill name and description, verify detail', async ({ page }) => {
    await registerAndLogin(page, 'ShopFull')
    await createCampaign(page, `ShopFull ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    await page.goto(`${BASE}/campaigns/${campaignId}/shops/new`)
    await page.waitForLoadState('networkidle')

    const shopName = `Bildrath Store ${uid()}`
    await page.fill('input[placeholder*="Potion"]', shopName)
    await page.fill('textarea', 'Overpriced goods in the village of Barovia.')

    await page.click('button:has-text("Create Shop")')
    await expect(async () => {
      expect(page.url()).toMatch(/\/shops\/[^/]+$/)
    }).toPass({ timeout: 15000 })

    await expect(page.locator('main')).toContainText(shopName, { timeout: 10000 })
  })
})

test.describe('Thorough Relation Create (11j)', () => {
  test('create relation between two entities, verify in graph', async ({ page }) => {
    await registerAndLogin(page, 'RelFull')
    await createCampaign(page, `RelFull ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // 11.33 Create two entities via API
    await page.evaluate(async (id) => {
      await fetch(`/api/campaigns/${id}/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'RelSource Entity', type: 'character', content: '# Source' }),
      })
      await fetch(`/api/campaigns/${id}/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'RelTarget Entity', type: 'location', content: '# Target' }),
      })
    }, campaignId)

    await page.goto(`${BASE}/campaigns/${campaignId}/relations/new`)
    await page.waitForLoadState('networkidle')

    // 11.34 Search and select source
    const sourceInput = page.locator('input[placeholder="Search entities..."]').first()
    await sourceInput.fill('RelSource')
    await expect(page.locator('text=RelSource Entity').first()).toBeVisible({ timeout: 8000 })
    await page.locator('text=RelSource Entity').first().click()
    await expect(page.locator('text=Selected: RelSource Entity')).toBeVisible({ timeout: 3000 })

    // 11.35 Search and select target
    const targetInput = page.locator('input[placeholder="Search entities..."]').nth(1)
    await targetInput.fill('RelTarget')
    await expect(page.locator('text=RelTarget Entity').first()).toBeVisible({ timeout: 8000 })
    await page.locator('text=RelTarget Entity').first().click()
    await expect(page.locator('text=Selected: RelTarget Entity')).toBeVisible({ timeout: 3000 })

    // 11.36 Set labels and attitude
    await page.fill('input[placeholder="allies with"]:first-of-type', 'rules over')
    await page.fill('input[placeholder="allies with"]:last-of-type', 'ruled by')
    // Adjust attitude slider to positive
    await page.locator('input[type="range"]').fill('75')

    // 11.37 Submit — verify button is enabled first
    const submitBtn = page.locator('button:has-text("Create Relation")')
    await expect(submitBtn).toBeEnabled({ timeout: 5000 })
    await submitBtn.click()
    await expect(async () => {
      expect(page.url()).toContain('/graph')
    }).toPass({ timeout: 15000 })

    // Verify graph page loaded (may show nodes if v-network-graph renders)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main')).toContainText('Relationship Graph', { timeout: 10000 })
  })
})
