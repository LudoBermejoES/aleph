import { test, expect } from '@playwright/test'
import type { Browser, Page } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch, BASE } from './helpers'

const uid = () => `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 5)}`

/**
 * Wait until the browser context actually holds a session.
 *
 * `registerAndLogin()` cannot be trusted to have finished: it waits for the URL to "contain"
 * `${BASE}/`, which is already true on `${BASE}/register`, so it returns as soon as the submit
 * button is clicked — before better-auth's Set-Cookie has landed. Any API call made in that
 * window answers 401. (The DM fixture gets away with it only because `createCampaign()` does a
 * full page load first.) Polling /api/me is the only reliable signal.
 */
async function waitForSession(page: Page) {
  await expect(async () => {
    const status = await page
      .evaluate(async () => (await fetch('/api/me', { credentials: 'include' })).status)
      .catch(() => 0)
    expect(status).toBe(200)
  }).toPass({ timeout: 30000 })
}

interface Setup {
  campaignId: string
  slug: string
  token: string
  charName: string
}

/**
 * The DM half of every scenario: a campaign, an invite token for `role`, and a character.
 */
async function dmSetup(
  page: Page,
  role: string,
  characterOpts: Record<string, unknown> = {},
): Promise<Setup> {
  await registerAndLogin(page, `Notes DM ${uid()}`)
  await waitForSession(page)
  await createCampaign(page, `Notes Camp ${uid()}`)
  const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0] as string

  const invite = (await apiFetch(page, `/api/campaigns/${campaignId}/invite`, {
    method: 'POST',
    body: { role },
  })) as { token: string }

  const charName = `Oda Weinreich ${uid()}`
  const char = (await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
    method: 'POST',
    body: { name: charName, characterType: 'npc', content: '# Oda', ...characterOpts },
  })) as { slug: string }

  return { campaignId, slug: char.slug, token: invite.token, charName }
}

/** Register a fresh user in their own browser context and accept the invite. */
async function joinAsNewUser(
  browser: Browser,
  campaignId: string,
  token: string,
  name: string,
): Promise<Page> {
  const context = await browser.newContext()
  const page = await context.newPage()
  await registerAndLogin(page, name)
  await waitForSession(page)
  await apiFetch(page, `/api/campaigns/${campaignId}/join`, { method: 'POST', body: { token } })
  return page
}

async function openCharacter(page: Page, campaignId: string, slug: string) {
  await page.goto(`${BASE}/campaigns/${campaignId}/characters/${slug}`, {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForLoadState('networkidle')
}

test.describe('Character public notes', () => {
  test('a player who does not own the character gets a note-only editor, and the saved note appears attributed', async ({
    page,
    browser,
  }) => {
    const { campaignId, slug, token } = await dmSetup(page, 'player')
    const playerName = `Ana ${uid()}`
    const player = await joinAsNewUser(browser, campaignId, token, playerName)

    try {
      await openCharacter(player, campaignId, slug)

      // The empty state invites a note rather than showing a blank panel
      await expect(player.locator('[data-testid="notes-empty"]')).toBeVisible({ timeout: 15000 })

      // The dead end is gone: Edit character is offered
      const editLink = player.locator('[data-testid="edit-character"]')
      await expect(editLink).toBeVisible({ timeout: 15000 })
      await editLink.click()
      await player.waitForURL('**/edit', { timeout: 15000 })
      await player.waitForLoadState('networkidle')

      // The restricted editor: note field present…
      await expect(player.locator('[data-testid="character-note-only-form"]')).toBeVisible({
        timeout: 15000,
      })
      await expect(player.locator('[data-testid="note-body-input"]')).toBeVisible()
      await expect(player.locator('[data-testid="restricted-editor-explanation"]')).toBeVisible()

      // …and every owner-only field ABSENT FROM THE DOM, not merely disabled.
      // This is the property the restricted mode claims; a disabled input would still
      // ship its value and invite a devtools bypass.
      await expect(player.locator('[data-testid="character-form"]')).toHaveCount(0)
      // type / status / owner / visibility are <select>s that live only inside CharacterForm
      await expect(player.locator('main select')).toHaveCount(0)
      // the name field is the only text <input> in the full editor
      await expect(player.locator('main input')).toHaveCount(0)
      // exactly one textarea: the note. Backstory/history/description editors are gone.
      await expect(player.locator('main textarea')).toHaveCount(1)

      const noteText = `He lied about the ledger ${uid()}`
      await player.fill('[data-testid="note-body-input"]', noteText)
      await player.click('[data-testid="save-note"]')

      // Back on the character page the note is rendered, attributed, and marked as mine
      await player.waitForURL((url) => !url.pathname.endsWith('/edit'), { timeout: 15000 })
      await player.waitForLoadState('networkidle')
      const mine = player.locator('[data-testid="character-note-mine"]')
      await expect(mine).toBeVisible({ timeout: 15000 })
      await expect(mine).toContainText(noteText)
      await expect(mine.locator('[data-testid="note-author"]')).toContainText(playerName)
      await expect(mine.locator('[data-testid="note-updated"]')).not.toBeEmpty()

      // The DM sees the same note, attributed to the player and NOT marked as their own
      await openCharacter(page, campaignId, slug)
      const asDm = page.locator('[data-testid="character-note"]')
      await expect(asDm).toBeVisible({ timeout: 15000 })
      await expect(asDm).toContainText(noteText)
      await expect(asDm.locator('[data-testid="note-author"]')).toContainText(playerName)
      await expect(page.locator('[data-testid="character-note-mine"]')).toHaveCount(0)
    } finally {
      await player.context().close()
    }
  })

  test('the owner of the character still gets the full editor', async ({ page, browser }) => {
    const setup = await dmSetup(page, 'player')
    const player = await joinAsNewUser(browser, setup.campaignId, setup.token, `Owner ${uid()}`)

    try {
      // The DM assigns the character to the player
      const me = (await apiFetch(player, '/api/me')) as { id: string }
      await apiFetch(page, `/api/campaigns/${setup.campaignId}/characters/${setup.slug}`, {
        method: 'PUT',
        body: { ownerUserId: me.id, characterType: 'pc' },
      })

      await openCharacter(player, setup.campaignId, setup.slug)
      await player.click('[data-testid="edit-character"]')
      await player.waitForURL('**/edit', { timeout: 15000 })
      await player.waitForLoadState('networkidle')

      // Full editor, exactly as before this change
      await expect(player.locator('[data-testid="character-form"]')).toBeVisible({
        timeout: 15000,
      })
      await expect(player.locator('[data-testid="character-note-only-form"]')).toHaveCount(0)
    } finally {
      await player.context().close()
    }
  })

  test('an editor gets the full editor on a character they do not own', async ({
    page,
    browser,
  }) => {
    const setup = await dmSetup(page, 'editor')
    const editor = await joinAsNewUser(browser, setup.campaignId, setup.token, `Editor ${uid()}`)

    try {
      await openCharacter(editor, setup.campaignId, setup.slug)
      await editor.click('[data-testid="edit-character"]')
      await editor.waitForURL('**/edit', { timeout: 15000 })
      await editor.waitForLoadState('networkidle')

      await expect(editor.locator('[data-testid="character-form"]')).toBeVisible({
        timeout: 15000,
      })
      await expect(editor.locator('[data-testid="character-note-only-form"]')).toHaveCount(0)
    } finally {
      await editor.context().close()
    }
  })

  test('a visitor is offered no edit action and no note editor, but can still read notes', async ({
    page,
    browser,
  }) => {
    // A visitor is a non-member of a PUBLIC campaign looking at a PUBLIC character —
    // the only combination in which a visitor can see a character at all.
    const setup = await dmSetup(page, 'player', { visibility: 'public' })
    await apiFetch(page, `/api/campaigns/${setup.campaignId}`, {
      method: 'PUT',
      body: { isPublic: true },
    })
    // The DM leaves a note so there is something for the visitor to read
    await apiFetch(page, `/api/campaigns/${setup.campaignId}/characters/${setup.slug}/notes/me`, {
      method: 'PUT',
      body: { body: 'A note the visitor may read but not answer.' },
    })

    const context = await browser.newContext()
    const visitor = await context.newPage()
    try {
      await registerAndLogin(visitor, `Visitor ${uid()}`) // authenticated, never joined
      await waitForSession(visitor)
      await openCharacter(visitor, setup.campaignId, setup.slug)

      await expect(visitor.locator('[data-testid="character-notes"]')).toBeVisible({
        timeout: 15000,
      })
      await expect(visitor.locator('[data-testid="character-note"]')).toContainText(
        'A note the visitor may read but not answer.',
      )

      // No edit action, and no note editor — absent, not disabled
      await expect(visitor.locator('[data-testid="edit-character"]')).toHaveCount(0)
      await expect(visitor.locator('[data-testid="character-note-editor"]')).toHaveCount(0)
    } finally {
      await context.close()
    }
  })

  test('two members annotate the same character and neither note is lost', async ({
    page,
    browser,
  }) => {
    const setup = await dmSetup(page, 'player')
    const anaName = `Ana ${uid()}`
    const luisName = `Luis ${uid()}`
    const ana = await joinAsNewUser(browser, setup.campaignId, setup.token, anaName)

    // A second invite for the second player
    const invite2 = (await apiFetch(page, `/api/campaigns/${setup.campaignId}/invite`, {
      method: 'POST',
      body: { role: 'player' },
    })) as { token: string }
    const luis = await joinAsNewUser(browser, setup.campaignId, invite2.token, luisName)

    try {
      const anaText = `Ana's paragraphs ${uid()}`
      const luisText = `Luis's line ${uid()}`

      await openCharacter(ana, setup.campaignId, setup.slug)
      await ana.fill('[data-testid="character-note-editor"] textarea', anaText)
      await ana.click('[data-testid="character-note-editor"] [data-testid="save-note"]')
      await expect(ana.locator('[data-testid="character-note-mine"]')).toContainText(anaText, {
        timeout: 15000,
      })

      await openCharacter(luis, setup.campaignId, setup.slug)
      await luis.fill('[data-testid="character-note-editor"] textarea', luisText)
      await luis.click('[data-testid="character-note-editor"] [data-testid="save-note"]')
      await expect(luis.locator('[data-testid="character-note-mine"]')).toContainText(luisText, {
        timeout: 15000,
      })

      // Luis's save did not destroy Ana's text — both are on the page, attributed
      await openCharacter(page, setup.campaignId, setup.slug)
      const notes = page.locator('[data-testid="character-note"]')
      await expect(notes).toHaveCount(2, { timeout: 15000 })
      await expect(page.locator('[data-testid="character-notes"]')).toContainText(anaText)
      await expect(page.locator('[data-testid="character-notes"]')).toContainText(luisText)
      await expect(page.locator('[data-testid="character-notes"]')).toContainText(anaName)
      await expect(page.locator('[data-testid="character-notes"]')).toContainText(luisName)
    } finally {
      await ana.context().close()
      await luis.context().close()
    }
  })
})
