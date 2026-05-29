import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

async function createTemplateWithTextField(
  page: Parameters<typeof apiFetch>[0],
  campaignId: string,
  entityTypeSlug: string,
  isDefault = false,
) {
  return apiFetch(page, `/api/campaigns/${campaignId}/templates`, {
    method: 'POST',
    body: {
      name: `${entityTypeSlug} Template ${uid()}`,
      entityTypeSlug,
      isDefault,
      fields: [{ key: 'background', label: 'Background', fieldType: 'text', required: false }],
    },
  }) as Promise<{ id: string }>
}

test.describe('Template fields on character create/edit', () => {
  test('8.1: create character with template and field values; detail page shows Properties', async ({
    page,
  }) => {
    await registerAndLogin(page, 'TF Create E2E')
    await createCampaign(page, `TF Char Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const template = await createTemplateWithTextField(page, campaignId, 'character')

    // Create character via API with fields
    const char = (await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: {
        name: `Hero ${uid()}`,
        characterType: 'npc',
        templateId: template.id,
        fields: { background: 'Wizard' },
      },
    })) as { slug: string }

    await page.goto(
      `http://localhost:3333/campaigns/${campaignId}/characters/${char.slug}?tab=play`,
    )
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-testid="template-fields-display"]')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator('[data-testid="template-fields-display"]')).toContainText('Wizard')
  })

  test('8.2: edit character pre-populates template field values', async ({ page }) => {
    await registerAndLogin(page, 'TF Edit E2E')
    await createCampaign(page, `TF Edit Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const template = await createTemplateWithTextField(page, campaignId, 'character')

    const char = (await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: {
        name: `EditHero ${uid()}`,
        characterType: 'npc',
        templateId: template.id,
        fields: { background: 'Farmer' },
      },
    })) as { slug: string }

    await page.goto(`http://localhost:3333/campaigns/${campaignId}/characters/${char.slug}/edit`)
    await page.waitForLoadState('networkidle')

    // Template fields form should be visible with pre-populated value
    await expect(page.locator('[data-testid="template-fields-form"]')).toBeVisible({
      timeout: 10000,
    })
    const bgInput = page.locator('[data-testid="template-fields-form"] input[type="text"]').first()
    await expect(bgInput).toHaveValue('Farmer', { timeout: 5000 })

    // Update the value and save
    await bgInput.fill('Merchant')
    await page.click('button[type="submit"]')
    await page.waitForLoadState('networkidle')

    // Navigate directly to the play tab to see template fields
    await page.goto(
      `http://localhost:3333/campaigns/${campaignId}/characters/${char.slug}?tab=play`,
    )
    await page.waitForLoadState('networkidle')

    // Updated value shown
    await expect(page.locator('[data-testid="template-fields-display"]')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator('[data-testid="template-fields-display"]')).toContainText('Merchant')
  })

  test('8.5: default template is auto-selected on character create page', async ({ page }) => {
    await registerAndLogin(page, 'TF Default E2E')
    await createCampaign(page, `TF Default Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create a default template for character type
    await apiFetch(page, `/api/campaigns/${campaignId}/templates`, {
      method: 'POST',
      body: {
        name: `Default Char Tpl ${uid()}`,
        entityTypeSlug: 'character',
        isDefault: true,
        fields: [{ key: 'background', label: 'Background', fieldType: 'text', required: false }],
      },
    })

    await page.goto(`http://localhost:3333/campaigns/${campaignId}/characters/new`)
    await page.waitForLoadState('networkidle')

    // Template fields form should be auto-visible
    await expect(page.locator('[data-testid="template-fields-form"]')).toBeVisible({
      timeout: 10000,
    })
  })
})

test.describe('Template fields on location create/edit', () => {
  test('8.3: create location with template and fields; detail page shows Properties', async ({
    page,
  }) => {
    await registerAndLogin(page, 'TF Loc E2E')
    await createCampaign(page, `TF Loc Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const template = await createTemplateWithTextField(page, campaignId, 'location')

    const loc = (await apiFetch(page, `/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      body: {
        name: `Rivendell ${uid()}`,
        subtype: 'city',
        templateId: template.id,
        fields: { background: 'Elven city' },
      },
    })) as { slug: string }

    await page.goto(`http://localhost:3333/campaigns/${campaignId}/locations/${loc.slug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-testid="template-fields-display"]')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator('[data-testid="template-fields-display"]')).toContainText(
      'Elven city',
    )
  })
})

test.describe('Template fields on organization create/edit', () => {
  test('8.4: create organization with template and fields; detail page shows Properties', async ({
    page,
  }) => {
    await registerAndLogin(page, 'TF Org E2E')
    await createCampaign(page, `TF Org Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const template = await createTemplateWithTextField(page, campaignId, 'organization')

    const org = (await apiFetch(page, `/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      body: {
        name: `Fellowship ${uid()}`,
        type: 'faction',
        status: 'active',
        templateId: template.id,
        fields: { background: 'Heroic band' },
      },
    })) as { slug: string }

    await page.goto(`http://localhost:3333/campaigns/${campaignId}/organizations/${org.slug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-testid="template-fields-display"]')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator('[data-testid="template-fields-display"]')).toContainText(
      'Heroic band',
    )
  })
})
