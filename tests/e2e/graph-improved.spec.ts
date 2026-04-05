import { test, expect, type Page } from '@playwright/test'
import { BASE } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

// ─── Shared Setup ─────────────────────────────────────────────────────────────
// All tests share one browser page and one campaign to reduce overhead.
// Each test navigates to the relevant page from there.

let sharedPage: Page
let campaignId: string
let c1Slug: string // for character detail tests

test.beforeAll(async ({ browser }) => {
  sharedPage = await browser.newPage()
  const page = sharedPage

  // Register
  const email = `gi-${uid()}@example.com`
  await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('form', { timeout: 15000 })
  await page.fill('#name', `GI Tester ${uid()}`)
  await page.fill('#email', email)
  await page.fill('#password', 'testpassword123')
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE}/`, { timeout: 30000 })
  await page.waitForLoadState('networkidle')

  // Create campaign
  await page.waitForSelector('button:has-text("New Campaign")', { timeout: 15000 })
  await page.click('button:has-text("New Campaign")')
  await page.waitForSelector('input[placeholder*="Curse"]', { timeout: 5000 })
  await page.fill('input[placeholder*="Curse"]', `GI Camp ${uid()}`)
  await page.waitForTimeout(300)
  await page.evaluate(() => {
    const form = document.querySelector('[role="dialog"] form') as HTMLFormElement
    if (form) form.requestSubmit()
  })
  await page.waitForURL('**/campaigns/**', { timeout: 15000 })
  await page.waitForLoadState('networkidle')
  campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

  // Create entities, characters, and relations via API
  const setupResult = await page.evaluate(async (id: string) => {
    const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] || ''
    const mutatingHeaders = { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }

    // Two entities connected as allies
    const heraRes = await fetch(`/api/campaigns/${id}/entities`, {
      method: 'POST',
      headers: mutatingHeaders,
      body: JSON.stringify({ name: 'Hera', type: 'character', content: '# Hera' }),
    })
    const hera = await heraRes.json()

    const zeusRes = await fetch(`/api/campaigns/${id}/entities`, {
      method: 'POST',
      headers: mutatingHeaders,
      body: JSON.stringify({ name: 'Zeus', type: 'character', content: '# Zeus' }),
    })
    const zeus = await zeusRes.json()

    // Third entity (Ares) only connected to Zeus — not to Hera
    const aresRes = await fetch(`/api/campaigns/${id}/entities`, {
      method: 'POST',
      headers: mutatingHeaders,
      body: JSON.stringify({ name: 'Ares', type: 'character', content: '# Ares' }),
    })
    const ares = await aresRes.json()

    const types = await fetch(`/api/campaigns/${id}/relation-types`).then((r: Response) => r.json())
    const ally = types.find((t: any) => t.slug === 'ally') ?? types[0]
    const enemy = types.find((t: any) => t.slug === 'enemy') ?? ally

    const r1 = await fetch(`/api/campaigns/${id}/relations`, {
      method: 'POST',
      headers: mutatingHeaders,
      body: JSON.stringify({
        sourceEntityId: hera.id,
        targetEntityId: zeus.id,
        relationTypeId: ally.id,
        forwardLabel: 'allied with',
        reverseLabel: 'allied by',
        attitude: 80,
      }),
    })
    const r1Body = await r1.json()

    const r2 = await fetch(`/api/campaigns/${id}/relations`, {
      method: 'POST',
      headers: mutatingHeaders,
      body: JSON.stringify({
        sourceEntityId: zeus.id,
        targetEntityId: ares.id,
        relationTypeId: enemy.id,
        forwardLabel: 'rival of',
        reverseLabel: 'rival of',
        attitude: -60,
      }),
    })
    const r2Body = await r2.json()

    return {
      csrf,
      hera: { status: heraRes.status, id: hera.id, name: hera.name },
      zeus: { status: zeusRes.status, id: zeus.id, name: zeus.name },
      ares: { status: aresRes.status, id: ares.id, name: ares.name },
      types: types.map((t: any) => t.slug),
      rel1: { status: r1.status, body: r1Body },
      rel2: { status: r2.status, body: r2Body },
    }
  }, campaignId)
  console.log('Setup result:', JSON.stringify(setupResult))

  // Create two characters and a relation — for character detail tests
  c1Slug = await page.evaluate(async (id: string) => {
    const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] || ''
    const mutatingHeaders = { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }

    const c1 = await fetch(`/api/campaigns/${id}/characters`, {
      method: 'POST',
      headers: mutatingHeaders,
      body: JSON.stringify({ name: 'Achilles', characterType: 'pc' }),
    }).then((r: Response) => r.json())

    const c2 = await fetch(`/api/campaigns/${id}/characters`, {
      method: 'POST',
      headers: mutatingHeaders,
      body: JSON.stringify({ name: 'Patroclus', characterType: 'pc' }),
    }).then((r: Response) => r.json())

    const entities = await fetch(`/api/campaigns/${id}/entities`).then((r: Response) => r.json())
    const entityList = entities.entities ?? entities
    const e1 = entityList.find((e: any) => e.slug === c1.slug)
    const e2 = entityList.find((e: any) => e.slug === c2.slug)
    const types = await fetch(`/api/campaigns/${id}/relation-types`).then((r: Response) => r.json())
    const allyType = types.find((t: any) => t.slug === 'ally')

    await fetch(`/api/campaigns/${id}/relations`, {
      method: 'POST',
      headers: mutatingHeaders,
      body: JSON.stringify({
        sourceEntityId: e1.id,
        targetEntityId: e2.id,
        relationTypeId: allyType.id,
        forwardLabel: 'ally',
        reverseLabel: 'ally',
      }),
    })
    return c1.slug
  }, campaignId)
})

test.afterAll(async () => {
  await sharedPage.close()
})

/** Navigate to campaign graph page and wait for SVG to render. */
async function goToGraphPage(page: Page) {
  // Intercept graph API to debug node count
  let graphApiNodes = 0
  const handler = (response: any) => {
    if (response.url().includes('/graph') && response.status() === 200) {
      response
        .json()
        .then((data: any) => {
          graphApiNodes = Object.keys(data.nodes || {}).length
          console.log(
            `Graph API returned ${graphApiNodes} nodes, ${Object.keys(data.edges || {}).length} edges`,
          )
        })
        .catch(() => {})
    }
  }
  page.on('response', handler)

  await page.goto(`${BASE}/campaigns/${campaignId}/graph`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  page.off('response', handler)

  // Wait for ClientOnly hydration + SVG render
  await expect(page.locator('[data-testid="entity-graph-view"]')).toBeVisible({ timeout: 15000 })
  await page.waitForSelector(
    '[data-testid="entity-graph-view"] svg.v-network-graph, [data-testid="entity-graph-view"] svg',
    { timeout: 20000 },
  )
  // Wait for force layout to produce stable positions
  await page.waitForTimeout(1500)
}

// 12.11: Campaign graph page renders graph container with nodes
test('12.11 campaign graph renders nodes and edges', async () => {
  const page = sharedPage
  await goToGraphPage(page)

  await expect(page.locator('[data-testid="entity-graph-view"]')).toBeVisible()
  await expect(page.locator('[data-testid="entity-graph-view"] svg').first()).toBeVisible()
  // Node labels are rendered as SVG text
  await expect(page.locator('[data-testid="entity-graph-view"] svg text').first()).toBeVisible({
    timeout: 10000,
  })
})

// 12.12: GraphLegend renders below graph with relation type entries
test('12.12 GraphLegend renders with relation type color entries', async () => {
  const page = sharedPage
  await goToGraphPage(page)

  await expect(page.locator('[data-testid="graph-legend"]')).toBeVisible({ timeout: 10000 })
  // At least one entry (ally relation type is present)
  await expect(page.locator('[data-testid="graph-legend"] > div').first()).toBeVisible()
})

// 12.13: Clicking a node dims non-neighbors
test('12.13 clicking a node dims non-neighbor nodes', async () => {
  test.setTimeout(60000)
  const page = sharedPage
  await goToGraphPage(page)

  // Click the "Hera" node — Ares is NOT directly connected to Hera, so Ares should be dimmed
  const heraText = page
    .locator('[data-testid="entity-graph-view"] svg text')
    .filter({ hasText: /Hera/ })
    .first()
  await expect(heraText).toBeVisible({ timeout: 10000 })
  await heraText.click()
  await page.waitForTimeout(1200)

  // After focusing Hera, some g elements should have opacity 0.1 (via style or CSS)
  const debugInfo = await page.evaluate(() => {
    const gs = document.querySelectorAll('[data-testid="entity-graph-view"] svg g')
    const opacities = Array.from(gs)
      .map((g) => (g as HTMLElement).style.opacity)
      .filter(Boolean)
    const nodeGs = document.querySelectorAll('[data-testid="entity-graph-view"] svg g.v-ng-node')
    const overrideGs = document.querySelectorAll(
      '[data-testid="entity-graph-view"] svg g.v-ng-node > g',
    )
    const overrideOpacities = Array.from(overrideGs).map((g) => ({
      opacity: (g as HTMLElement).style.opacity,
    }))
    const labels = Array.from(
      document.querySelectorAll('[data-testid="entity-graph-view"] svg text'),
    ).map((t) => t.textContent?.trim())
    return {
      totalGs: gs.length,
      opacities,
      nodeCount: nodeGs.length,
      overrideGs: overrideGs.length,
      overrideOpacities,
      labels,
    }
  })
  console.log('Debug graph elements:', JSON.stringify(debugInfo))
  const hasDimmedNode = debugInfo.overrideOpacities.some((o: any) => parseFloat(o.opacity) < 0.5)
  expect(hasDimmedNode).toBe(true)
})

// 12.14: Clicking background clears focus
test('12.14 clicking background clears node focus', async () => {
  const page = sharedPage
  await goToGraphPage(page)

  // Focus Hera first
  const heraText = page
    .locator('[data-testid="entity-graph-view"] svg text')
    .filter({ hasText: /Hera/ })
    .first()
  await expect(heraText).toBeVisible({ timeout: 10000 })
  await heraText.click()
  await page.waitForTimeout(1200)

  // Confirm something is dimmed
  const hasDimmedNode = await page.evaluate(() => {
    const overrideGs = document.querySelectorAll(
      '[data-testid="entity-graph-view"] svg g.v-ng-node > g',
    )
    return Array.from(overrideGs).some((g) => parseFloat((g as HTMLElement).style.opacity) < 0.5)
  })
  expect(hasDimmedNode).toBe(true)

  // Click background (SVG top-left corner away from nodes)
  const svg = page.locator('[data-testid="entity-graph-view"] svg').first()
  await svg.click({ position: { x: 5, y: 5 } })
  await page.waitForTimeout(800)

  // No dimmed nodes remain
  const stillDimmed = await page.evaluate(() => {
    const overrideGs = document.querySelectorAll(
      '[data-testid="entity-graph-view"] svg g.v-ng-node > g',
    )
    return Array.from(overrideGs).some((g) => parseFloat((g as HTMLElement).style.opacity) < 0.5)
  })
  expect(stillDimmed).toBe(false)
})

// 12.15: Double-clicking a character node navigates to character page
test('12.15 double-clicking character node navigates to character detail', async () => {
  const page = sharedPage
  await goToGraphPage(page)

  // v-network-graph node:dblclick fires on .v-ng-node group elements, not on the label text.
  // Double-click the first interactive node circle group.
  const nodeGroup = page.locator('[data-testid="entity-graph-view"] svg g.v-ng-node').first()
  await expect(nodeGroup).toBeVisible({ timeout: 10000 })
  await nodeGroup.dblclick()

  // Wait for navigation away from /graph page to a character or entity detail page
  await page.waitForURL((url) => !url.toString().endsWith('/graph'), { timeout: 10000 })
  expect(page.url()).toMatch(/\/campaigns\/.+\/(characters|entities)\//)
})

// 12.16: Character detail graph renders with center node
test('12.16 character detail graph renders with character as center', async () => {
  const page = sharedPage
  await page.goto(`${BASE}/campaigns/${campaignId}/characters/${c1Slug}`, {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForLoadState('networkidle')

  await expect(page.locator('[data-testid="character-graph"]')).toBeVisible({ timeout: 15000 })
  await expect(
    page.locator('[data-testid="character-graph"] [data-testid="entity-graph-view"]'),
  ).toBeVisible({ timeout: 15000 })
  await page.waitForSelector(
    '[data-testid="character-graph"] [data-testid="entity-graph-view"] svg',
    { timeout: 20000 },
  )
  await expect(
    page.locator('[data-testid="character-graph"] [data-testid="entity-graph-view"] svg').first(),
  ).toBeVisible()
})

// 12.17: Hovering a node shows tooltip with name and connection count
test('12.17 hovering a node shows tooltip with entity info', async () => {
  const page = sharedPage
  await goToGraphPage(page)

  // Hover over first node label
  const firstNodeText = page.locator('[data-testid="entity-graph-view"] svg text').first()
  await expect(firstNodeText).toBeVisible({ timeout: 10000 })
  await firstNodeText.hover()

  // Tooltip appears after 200ms delay
  await page.waitForTimeout(500)
  await expect(page.locator('[data-testid="graph-tooltip"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('[data-testid="graph-tooltip"]')).toContainText('connection')
})
