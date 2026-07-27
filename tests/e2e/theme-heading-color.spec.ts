import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { registerAndLogin, apiFetch, BASE } from './helpers'

/**
 * Heading colour is opt-in per theme via --theme-heading-color. Only
 * mage-ascension defines it (arcane gold, == its --accent). These tests prove,
 * in a real browser:
 *   1. bare page headings compute to the gold under mage-ascension,
 *   2. headings inside a .prose chronicle do too,
 *   3. a heading carrying an explicit colour utility (text-destructive) is NOT
 *      hijacked — the rule sits at element weight on purpose,
 *   4. another theme's headings are byte-identical to the inherited colour,
 *      i.e. the mechanism is inert without the token.
 *
 * Kept out of campaign-themes.spec.ts because that file has a known one-test
 * flake in full-file runs; these assertions should not inherit it.
 */

const GOLD = 'rgb(225, 177, 55)' // hsl(43 74% 55%)
const MAGE_DESTRUCTIVE = 'rgb(174, 41, 41)' // hsl(0 62% 42%)
const SIDEBAR_PRIMARY = 'rgb(186, 119, 249)' // hsl(271 91% 72%)
const DARK_FANTASY_FG = 'rgb(232, 217, 201)' // hsl(30 40% 85%)
const DARK_FANTASY_PRIMARY = 'rgb(173, 31, 31)' // hsl(0 70% 40%)

const uid = () => Date.now().toString(36).slice(-4)

/**
 * Create a campaign with an explicit theme through the create dialog. Assumes
 * registerAndLogin() just landed us on the home page — navigating there again
 * races the freshly-set session cookie and bounces to /login.
 */
async function createThemedCampaign(page: Page, name: string, theme: string): Promise<string> {
  await page.waitForSelector('button:has-text("New Campaign")', { timeout: 15000 })
  await page.click('button:has-text("New Campaign")')
  await page.waitForSelector('input[placeholder*="Curse"]', { timeout: 5000 })
  await page.fill('input[placeholder*="Curse"]', name)
  await page.selectOption('[role="dialog"] select', theme)
  await page.waitForTimeout(300)
  await page.evaluate(() => {
    const form = document.querySelector('[role="dialog"] form') as HTMLFormElement
    if (form) form.requestSubmit()
  })
  await page.waitForURL(/\/campaigns\//, { timeout: 15000 })
  await page.waitForLoadState('networkidle')
  await expect(page.locator('div.flex.h-screen').first()).toHaveAttribute('data-theme', theme, {
    timeout: 10000,
  })
  return page.url().split('/campaigns/')[1]!.split('/')[0]!
}

const colorOf = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).color)

test.describe('Theme heading colour', () => {
  test('mage-ascension: page headings compute to the arcane gold', async ({ page }) => {
    await registerAndLogin(page, `Gold DM ${uid()}`)
    await createThemedCampaign(page, `Gold Overview ${uid()}`, 'mage-ascension')

    // h1 = campaign title, h2 = the section headings further down the overview.
    expect(await colorOf(page, 'main h1')).toBe(GOLD)
    expect(await colorOf(page, 'main h2')).toBe(GOLD)

    // The sidebar wordmark h1 carries `text-sidebar-primary`; it must keep the
    // brand violet rather than turning gold (element-weight rule, utility wins).
    const wordmark = page.locator('h1.text-sidebar-primary').first()
    expect(await wordmark.evaluate((el) => getComputedStyle(el).color)).toBe(SIDEBAR_PRIMARY)

    await page.screenshot({
      path: 'test-results/heading-gold-campaign-overview.png',
      fullPage: true,
    })
  })

  test('mage-ascension: an explicitly coloured heading keeps its own colour', async ({ page }) => {
    await registerAndLogin(page, `Gold Utility DM ${uid()}`)
    await createThemedCampaign(page, `Gold Utility ${uid()}`, 'mage-ascension')

    // The Danger Zone h2 carries `text-destructive`. The heading-colour rule is
    // at element weight, so the utility still wins.
    const danger = page.locator('main h2.text-destructive').first()
    await expect(danger).toBeVisible({ timeout: 10000 })
    expect(await danger.evaluate((el) => getComputedStyle(el).color)).toBe(MAGE_DESTRUCTIVE)
  })

  test('mage-ascension: chronicle prose headings compute to the gold', async ({ page }) => {
    await registerAndLogin(page, `Gold Prose DM ${uid()}`)
    const campaignId = await createThemedCampaign(page, `Gold Prose ${uid()}`, 'mage-ascension')

    await apiFetch(page, `/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      body: {
        title: 'La Noche de los Espejos',
        content: [
          '## El Umbral',
          '',
          'La Consciencia se dobló sobre sí misma aquella noche, y los magos',
          'sintieron el Paradoja acumularse como estática en los dientes. Nadie',
          'quiso nombrar lo que cruzó el umbral, porque nombrarlo lo haría real',
          'dentro del Consenso, y el Consenso ya estaba bastante roto.',
          '',
          '### Los Testigos',
          '',
          'Tres cronistas, tres versiones, ninguna reconciliable. El primero habló',
          'de una puerta; el segundo, de un espejo; el tercero se negó a hablar y',
          'escribió durante horas en un idioma que nadie del cónclave reconoció.',
        ].join('\n'),
      },
    })

    await page.goto(`${BASE}/campaigns/${campaignId}/sessions/la-noche-de-los-espejos`, {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.locator('main h1')).toContainText('Noche', { timeout: 15000 })
    await page.waitForLoadState('networkidle')

    const proseH2 = page.locator('.prose h2', { hasText: 'El Umbral' }).first()
    await expect(proseH2).toBeVisible({ timeout: 15000 })
    expect(await proseH2.evaluate((el) => getComputedStyle(el).color)).toBe(GOLD)

    const proseH3 = page.locator('.prose h3', { hasText: 'Los Testigos' }).first()
    expect(await proseH3.evaluate((el) => getComputedStyle(el).color)).toBe(GOLD)

    // MDC wraps each markdown heading in an anchor, and the anchor carries the
    // visible glyphs — assert the colour a reader actually sees, not just the
    // heading box. (A computed-style check on the h2 alone missed this.)
    const anchors = await page
      .locator('.prose :is(h1, h2, h3) a')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).color))
    expect(anchors.length).toBeGreaterThan(0)
    for (const c of anchors) expect(c).toBe(GOLD)

    // The prose body text itself stays the reading colour, not gold.
    const bodyColor = await colorOf(page, '.prose p')
    expect(bodyColor).not.toBe(GOLD)

    await page.screenshot({ path: 'test-results/heading-gold-session-detail.png', fullPage: true })
  })

  test('dark-fantasy: headings still inherit, unchanged by the new rule', async ({ page }) => {
    await registerAndLogin(page, `No Gold DM ${uid()}`)
    await createThemedCampaign(page, `No Gold ${uid()}`, 'dark-fantasy')

    const h1 = page.locator('main h1').first()
    await expect(h1).toBeVisible({ timeout: 10000 })

    // Identical to the colour it inherits from its parent — the `inherit`
    // fallback is a true no-op — and definitely not gold.
    const [own, parent] = await h1.evaluate((el) => [
      getComputedStyle(el).color,
      getComputedStyle(el.parentElement as HTMLElement).color,
    ])
    expect(own).toBe(parent)
    expect(own).toBe(DARK_FANTASY_FG)
    expect(own).not.toBe(GOLD)

    // And the token itself is undefined for this theme.
    const token = await h1.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--theme-heading-color').trim(),
    )
    expect(token).toBe('')
  })

  test('dark-fantasy: prose headings and their anchors are unchanged', async ({ page }) => {
    await registerAndLogin(page, `No Gold Prose DM ${uid()}`)
    const campaignId = await createThemedCampaign(page, `No Gold Prose ${uid()}`, 'dark-fantasy')

    await apiFetch(page, `/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      body: { title: 'The Long Dark', content: '## Below the Keep\n\nMud, then worse than mud.' },
    })
    await page.goto(`${BASE}/campaigns/${campaignId}/sessions/the-long-dark`, {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.locator('main h1')).toContainText('Long Dark', { timeout: 15000 })
    await page.waitForLoadState('networkidle')

    const proseH2 = page.locator('.prose h2', { hasText: 'Below the Keep' }).first()
    await expect(proseH2).toBeVisible({ timeout: 15000 })
    // `.prose *` sets inherit → the prose body colour, i.e. --foreground.
    expect(await proseH2.evaluate((el) => getComputedStyle(el).color)).toBe(DARK_FANTASY_FG)
    // The heading anchor keeps `.prose a`'s colour, hsl(var(--primary)).
    const anchor = page.locator('.prose h2 a').first()
    expect(await anchor.evaluate((el) => getComputedStyle(el).color)).toBe(DARK_FANTASY_PRIMARY)

    await page.screenshot({
      path: 'test-results/heading-unchanged-dark-fantasy-session.png',
      fullPage: true,
    })
  })
})
