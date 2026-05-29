import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

/**
 * E2E tests for TemplateFieldsDisplay rendering on detail pages (tasks 3.3, 4.3, 5.3, 6.3)
 */

test.describe('Template fields display on character detail page', () => {
  test('character with template and field values shows Properties panel', async ({ page }) => {
    await registerAndLogin(page, 'Template E2E')
    await createCampaign(page, `Template Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create a template with fields inline
    const template = (await apiFetch(page, `/api/campaigns/${campaignId}/templates`, {
      method: 'POST',
      body: {
        name: 'Hero Template',
        entityTypeSlug: 'character',
        fields: [
          { key: 'hometown', label: 'Hometown', fieldType: 'text' },
          { key: 'isLegendary', label: 'Is Legendary', fieldType: 'checkbox' },
        ],
      },
    })) as { id: string }
    const templateId = template.id

    // Create a character linked to the template with stored field values
    const charName = `Hero ${uid()}`
    const char = (await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: {
        name: charName,
        characterType: 'npc',
        templateId,
        fields: { hometown: 'Rivendell', isLegendary: true },
      },
    })) as { slug: string }
    const charSlug = char.slug

    // Navigate to character detail page — template fields are on the "play" tab
    await page.goto(`http://localhost:3333/campaigns/${campaignId}/characters/${charSlug}?tab=play`)
    await page.waitForLoadState('networkidle')

    // Properties panel should be visible
    await expect(page.locator('[data-testid="template-fields-display"]')).toBeVisible({
      timeout: 10000,
    })

    // Field labels and values should be present
    await expect(page.locator('[data-testid="template-fields-display"]')).toContainText('Hometown')
    await expect(page.locator('[data-testid="template-fields-display"]')).toContainText('Rivendell')
    await expect(page.locator('[data-testid="template-fields-display"]')).toContainText(
      'Is Legendary',
    )
    await expect(page.locator('[data-testid="template-fields-display"]')).toContainText('Yes')
  })

  test('character without template shows no Properties panel', async ({ page }) => {
    await registerAndLogin(page, 'No Template E2E')
    await createCampaign(page, `No Template Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const charName = `Plain NPC ${uid()}`
    const char = (await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: charName, characterType: 'npc' },
    })) as { slug: string }

    await page.goto(
      `http://localhost:3333/campaigns/${campaignId}/characters/${char.slug}?tab=play`,
    )
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-testid="template-fields-display"]')).not.toBeVisible({
      timeout: 5000,
    })
  })
})

test.describe('Template fields display on entity detail page', () => {
  test('entity with template and field values shows Properties panel', async ({ page }) => {
    await registerAndLogin(page, 'Entity Template E2E')
    await createCampaign(page, `Entity Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const template = (await apiFetch(page, `/api/campaigns/${campaignId}/templates`, {
      method: 'POST',
      body: {
        name: 'Location Template',
        entityTypeSlug: 'location',
        fields: [{ key: 'region', label: 'Region', fieldType: 'text' }],
      },
    })) as { id: string }
    const templateId = template.id

    const entityName = `Rivendell ${uid()}`
    const entity = (await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: {
        name: entityName,
        type: 'location',
        templateId,
        fields: { region: 'Eriador' },
      },
    })) as { slug: string }

    await page.goto(`http://localhost:3333/campaigns/${campaignId}/entities/${entity.slug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-testid="template-fields-display"]')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator('[data-testid="template-fields-display"]')).toContainText('Region')
    await expect(page.locator('[data-testid="template-fields-display"]')).toContainText('Eriador')
  })
})

test.describe('Template fields display on location detail page', () => {
  test('location with template shows Properties panel', async ({ page }) => {
    await registerAndLogin(page, 'Loc Template E2E')
    await createCampaign(page, `Loc Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const template = (await apiFetch(page, `/api/campaigns/${campaignId}/templates`, {
      method: 'POST',
      body: {
        name: 'Place Template',
        entityTypeSlug: 'location',
        fields: [{ key: 'climate', label: 'Climate', fieldType: 'text' }],
      },
    })) as { id: string }
    const templateId = template.id

    const locationName = `Mirkwood ${uid()}`
    const loc = (await apiFetch(page, `/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      body: {
        name: locationName,
        templateId,
        fields: { climate: 'Dark forest' },
      },
    })) as { slug: string }

    await page.goto(`http://localhost:3333/campaigns/${campaignId}/locations/${loc.slug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-testid="template-fields-display"]')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator('[data-testid="template-fields-display"]')).toContainText('Climate')
    await expect(page.locator('[data-testid="template-fields-display"]')).toContainText(
      'Dark forest',
    )
  })
})

test.describe('Template fields display on organization detail page', () => {
  test('organization with template shows Properties panel', async ({ page }) => {
    await registerAndLogin(page, 'Org Template E2E')
    await createCampaign(page, `Org Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const template = (await apiFetch(page, `/api/campaigns/${campaignId}/templates`, {
      method: 'POST',
      body: {
        name: 'Org Template',
        entityTypeSlug: 'organization',
        fields: [{ key: 'motto', label: 'Motto', fieldType: 'text' }],
      },
    })) as { id: string }
    const templateId = template.id

    const orgName = `Fellowship ${uid()}`
    const org = (await apiFetch(page, `/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      body: {
        name: orgName,
        templateId,
        fields: { motto: 'One for all' },
      },
    })) as { slug: string }

    await page.goto(`http://localhost:3333/campaigns/${campaignId}/organizations/${org.slug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-testid="template-fields-display"]')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator('[data-testid="template-fields-display"]')).toContainText('Motto')
    await expect(page.locator('[data-testid="template-fields-display"]')).toContainText(
      'One for all',
    )
  })
})
