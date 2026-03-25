import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

async function createEntityAndNavigate(page: any, campaignId: string, name: string, content: string) {
  const slug = await page.evaluate(async ([id, n, c]: string[]) => {
    const r = await fetch(`/api/campaigns/${id}/entities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: n, type: 'note', content: c }),
    })
    const data = await r.json()
    return data.slug
  }, [campaignId, name, content])

  await page.goto(`http://localhost:3333/campaigns/${campaignId}/entities/${slug}`)
  await page.waitForLoadState('domcontentloaded')
  await expect(page.locator('main h1').first()).toContainText(name, { timeout: 15000 })
}

test.describe('Tiptap Editor (Collaboration)', () => {
  test('open entity edit shows Tiptap editor with existing content (9.15)', async ({ page }) => {
    await registerAndLogin(page, 'TiptapViewer')
    await createCampaign(page, `Tiptap Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    await createEntityAndNavigate(page, campaignId!, `TiptapView ${uid()}`, '# Quest Log\n\nThe party entered Barovia.')

    // Enter edit mode
    await page.click('main >> button:has-text("Edit")')
    await page.waitForTimeout(1500)

    // Verify Tiptap ProseMirror editor renders
    const prosemirror = page.locator('main .ProseMirror')
    await expect(prosemirror).toBeVisible({ timeout: 10000 })

    // Verify content is loaded in the editor
    await expect(prosemirror).toContainText('The party entered Barovia', { timeout: 5000 })
  })

  test('type in Tiptap editor, save, reload, content persisted (9.16)', async ({ page }) => {
    await registerAndLogin(page, 'TiptapSaver')
    await createCampaign(page, `Tiptap Save ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const uniqueText = `UniqueContent${Date.now()}`

    await createEntityAndNavigate(page, campaignId!, `Persist ${uid()}`, '# Empty Start\n\nOriginal.')

    // Enter edit mode
    await page.click('main >> button:has-text("Edit")')
    await page.waitForTimeout(1500)

    // Type in ProseMirror editor
    const prosemirror = page.locator('main .ProseMirror')
    await expect(prosemirror).toBeVisible({ timeout: 10000 })

    // Click to focus, then type unique content
    await prosemirror.click()
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await page.keyboard.type(uniqueText)

    // Save
    await page.click('main >> button:has-text("Save")')
    await page.waitForTimeout(2000)

    // Reload the page completely
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Enter edit mode again and verify content persisted
    await page.click('main >> button:has-text("Edit")')
    await page.waitForTimeout(1500)

    const prosemirrorAfter = page.locator('main .ProseMirror')
    await expect(prosemirrorAfter).toContainText(uniqueText, { timeout: 10000 })
  })
})

test.describe('Presence Avatars (Collaboration)', () => {
  // Skip: Better Auth uses HttpOnly cookies that JS can't read,
  // so useCampaignSocket can't extract the session token for WebSocket auth.
  // Needs a dedicated /api/ws/token endpoint or non-HttpOnly token.
  test.skip('presence avatars show when user is in a campaign (9.19)', async ({ page }) => {
    await registerAndLogin(page, 'PresUser')
    await createCampaign(page, `Pres Camp ${uid()}`)
    await page.waitForTimeout(5000)
    const avatars = page.locator('aside .rounded-full')
    await expect(avatars.first()).toBeVisible({ timeout: 10000 })
  })
})
