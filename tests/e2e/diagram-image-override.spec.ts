/**
 * Per-shape diagram card images, end to end in a real browser.
 *
 * What these cover, and why each one is here rather than at a lower level:
 *
 * - **An object gets a second photograph and then a chosen card image** (task 3.4, the owner's
 *   literal request). Two halves that only meet in the browser: the new generic gallery under
 *   `entities/[slug]/images` (an object could hold exactly one image before) and the per-shape
 *   picker. Asserted through the UI on both sides — the file input on the entity page, the
 *   thumbnails in the shape's own popover — and read back from the RENDERED `<img src>` on the
 *   canvas, not from a prop.
 * - **Two cards of one entity, one switched** (3.1). The whole point of the feature is "per card",
 *   which no unit test of the resolution rule can prove: it needs two shapes of one entity in one
 *   snapshot, a reload, and the entity's own primary image still untouched afterwards.
 * - **A deleted overridden image falls back to the primary** (3.2). Asserted as "the primary's URL
 *   AND the image really decoded" (`naturalWidth > 0`), because the failure this guards against is a
 *   BROKEN image, and a broken `<img>` still has the right `src`.
 * - **A read-only viewer is offered no picker** (3.3). With a positive control in the same test —
 *   the DM sees the picker on the same diagram, the same shape — because a `toHaveCount(0)` against
 *   a selector that never existed passes just as happily as one that is genuinely absent.
 * - **The picker marks what the card is showing, and clicking that mark writes nothing** (3.6).
 *   Both halves of one defect and its fix: marking by the shape's override left the DEFAULT state
 *   (no override, showing the primary) with nothing marked, and marking the primary correctly then
 *   made a click on it able to pin the card away from the entity's main image for ever.
 * - **An organization card, by override (3.5) and by primary (3.7).** `factionCard` is the only
 *   image-bearing shape whose main image lives in a different column, so it is the only one a
 *   mocked-editor unit test cannot judge. 3.7 asserts its FIXTURE first — `organizations.image_url`
 *   set, `entities.image_url` NULL — because with both columns populated no version of the
 *   resolution order can fail and the test would be affirming the bug.
 *
 * Hydration is the load-bearing half: it used to rewrite a card's image from the entity's primary on
 * every load, so every "it survives a reload" assertion below is really an assertion about
 * `diagram-hydration.ts`, not about the picker. Two further traps are baked into the helpers below
 * and cost real measurements: a card renders its stored URL BEFORE hydration runs (so an assertion
 * taken too early passes against the bug), and a reload assertion whose expected value equals the
 * stored value cannot fail at all.
 */
import { test, expect, type Page } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch, BASE } from './helpers'

const uid = () => `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 5)}`

const PNG_1PX_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

interface GalleryImage {
  id: string
  url: string
  isPrimary: boolean
}

async function waitForSession(page: Page) {
  await expect(async () => {
    const status = await page
      .evaluate(async () => (await fetch('/api/me', { credentials: 'include' })).status)
      .catch(() => 0)
    expect(status).toBe(200)
  }).toPass({ timeout: 30000 })
}

async function setupDmCampaign(page: Page, label: string): Promise<string> {
  await registerAndLogin(page, `${label} DM ${uid()}`)
  await waitForSession(page)
  await createCampaign(page, `${label} Camp ${uid()}`)
  const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0] as string
  expect(campaignId).toBeTruthy()
  return campaignId
}

/** An OBJECT — `type: 'item'`. The type the owner named, and the one that could not hold a gallery. */
async function createItem(page: Page, campaignId: string, name: string) {
  return (await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
    method: 'POST',
    body: { name, type: 'item', content: 'Un objeto con varias fotografías.' },
  })) as { id: string; slug: string; name: string }
}

/** Upload through the gallery's own file input — the control a DM actually uses. */
async function uploadViaGalleryUi(page: Page, filename: string) {
  await page.setInputFiles('[data-testid="gallery-file-input"]', {
    name: filename,
    mimeType: 'image/png',
    buffer: Buffer.from(PNG_1PX_BASE64, 'base64'),
  })
}

async function listGallery(page: Page, campaignId: string, slug: string): Promise<GalleryImage[]> {
  return (await apiFetch(
    page,
    `/api/campaigns/${campaignId}/entities/${slug}/images`,
  )) as GalleryImage[]
}

async function createDiagram(page: Page, campaignId: string, title: string) {
  return (await apiFetch(page, `/api/campaigns/${campaignId}/diagrams`, {
    method: 'POST',
    body: { title, diagramType: 'freeform' },
  })) as { id: string }
}

interface CardSpec {
  shapeId: string
  entityId: string
  slug: string
  name: string
  x: number
  y: number
  portraitUrl?: string
  imageOverrideId?: string
}

/**
 * A snapshot with entityCard shapes. Hand-built rather than drag-dropped from the palette: an HTML5
 * drag with a `dataTransfer` payload is not reproducible in Playwright, and the same pattern is
 * already how `diagram-enhancements.spec.ts` places a shape.
 */
function snapshotWithCards(campaignId: string, cards: CardSpec[]) {
  const store: Record<string, unknown> = {
    'document:document': {
      id: 'document:document',
      typeName: 'document',
      gridSize: 10,
      name: '',
      meta: {},
    },
    'page:page': { id: 'page:page', typeName: 'page', name: 'Page 1', index: 'a1', meta: {} },
  }
  cards.forEach((card, i) => {
    const props: Record<string, unknown> = {
      w: 200,
      h: 80,
      entityId: card.entityId,
      campaignId,
      entityName: card.name,
      entityType: 'item',
      slug: card.slug,
    }
    if (card.portraitUrl) props.portraitUrl = card.portraitUrl
    // Only set when the scenario needs a pre-existing override: an absent prop is exactly the
    // "snapshot saved before this feature" case the optional validator has to accept.
    if (card.imageOverrideId) props.imageOverrideId = card.imageOverrideId
    store[card.shapeId] = {
      id: card.shapeId,
      typeName: 'shape',
      type: 'entityCard',
      x: card.x,
      y: card.y,
      rotation: 0,
      isLocked: false,
      opacity: 1,
      meta: {},
      parentId: 'page:page',
      index: `a${i + 1}`,
      props,
    }
  })
  return { store, schema: { schemaVersion: 2, sequences: {} } }
}

async function putSnapshot(
  page: Page,
  campaignId: string,
  diagramId: string,
  body: ReturnType<typeof snapshotWithCards>,
) {
  await apiFetch(page, `/api/campaigns/${campaignId}/diagrams/${diagramId}/snapshot`, {
    method: 'PUT',
    body,
  })
}

/**
 * Open a diagram and DO NOT return until hydration has run.
 *
 * This wait is the difference between a test that measures something and one that cannot fail.
 * Measured while writing this file: a card's `<img>` renders straight from the stored snapshot
 * first, and hydration overwrites it a moment later. So `toHaveAttribute('src', chosenUrl)` right
 * after a reload matched the SNAPSHOT's value and passed — and it still passed with hydration
 * mutated back to its old "always write the primary" behaviour, i.e. against the exact bug this
 * change exists to fix. Waiting for the `entities/batch` response (hydration's only request) plus a
 * settle for the resulting `updateShapes` render makes every assertion below a post-hydration one.
 */
async function openDiagram(page: Page, campaignId: string, diagramId: string) {
  const hydrated = page
    .waitForResponse((r) => r.url().includes('/diagrams/entities/batch'), { timeout: 90000 })
    .catch(() => null)
  await page.goto(`${BASE}/campaigns/${campaignId}/diagrams/${diagramId}`, {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('.tldraw-wrapper', { timeout: 90000 })
  const response = await hydrated
  expect(response, 'hydration never requested entities/batch').not.toBeNull()
  // The updateShapes that follows the response is synchronous; this covers the React re-render.
  await page.waitForTimeout(1000)
}

function shapeLocator(page: Page, shapeId: string) {
  return page.locator(`[data-shape-id="${shapeId}"]`)
}

/**
 * Double-click a shape the way a user reaches its preview.
 *
 * Two measured details, both of which produced a silent no-op:
 *
 * 1. tldraw puts `pointer-events: none` on shape DOM, so Playwright's hit-target check refuses a
 *    click on the element itself. Take its box and click the POINT — which also survives any camera
 *    transform, unlike hard-coded canvas coordinates.
 * 2. **Deselect first.** tldraw does not deliver `onDoubleClick` to a shape that is ALREADY
 *    SELECTED (it takes the edit-the-label branch instead), and the app saves the selection in the
 *    snapshot's `session`: reopening a diagram the app itself saved restores the card as selected,
 *    so the double-click raises no `aleph:entity-preview` at all. Measured on the same shape, same
 *    bounding box (548,241 200x80): 0 preview events selected, 1 after `Escape`. This is tldraw
 *    behaviour and predates this change; it is worth knowing because the popover is the ONLY way to
 *    reach the picker, and a DM reopening a saved diagram meets exactly this state.
 */
async function dblclickShape(page: Page, shapeId: string) {
  const shape = shapeLocator(page, shapeId)
  await expect(shape).toBeVisible({ timeout: 30000 })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  const box = await shape.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.dblclick(box!.x + box!.width / 2, box!.y + box!.height / 2)
}

/**
 * Raise `aleph:entity-preview` exactly as a shape's `onDoubleClick` does. Needed because a
 * read-only tldraw canvas never delivers a double-click to the shape at all, so a viewer test
 * driven only by the gesture cannot tell "the app refused" from "the canvas swallowed it".
 */
async function dispatchPreviewEvent(
  page: Page,
  detail: { entityId: string; campaignId: string; slug: string; shapeId: string },
) {
  await page.evaluate((d) => {
    window.dispatchEvent(
      new CustomEvent('aleph:entity-preview', { detail: { ...d, x: 200, y: 200 } }),
    )
  }, detail)
}

/**
 * Open a card's preview the way a DM does, and tolerate ONE known app defect while asserting
 * nothing false about it.
 *
 * `tldraw/dist-cjs/lib/tools/SelectTool/childStates/Idle.js`, `case "shape"`, reads:
 *
 *     if (util.onDoubleClick) { const change = util.onDoubleClick?.(shape); if (change) {...return} }
 *     ...
 *     if (this.editor.canEditShape(shape)) { startEditingShape(...) }
 *     else { this.handleDoubleClickOnCanvas(info) }      // <- creates a TEXT shape
 *
 * Every entity shape's `onDoubleClick` dispatches `aleph:entity-preview` and returns UNDEFINED, so
 * tldraw falls through and, because these shapes are not editable, ALSO runs
 * `handleDoubleClickOnCanvas`: each double-click on a card creates an empty text shape and enters
 * the rich-text editor (visible in a failure snapshot as a `textbox` plus a "Text formatting"
 * toolbar). The resulting canvas mousedown can close the popover the same gesture just opened —
 * which is why this retries the GESTURE rather than lengthening a timeout. Reported, not patched:
 * the shapes are not this workstream's files.
 *
 * If the popover genuinely never opens, this still fails — the retry tolerates a race, not an
 * absence.
 */
async function openCardPreview(page: Page, shapeId: string) {
  await expect(async () => {
    await dblclickShape(page, shapeId)
    await expect(page.locator('[data-testid="entity-popover"]')).toBeVisible({ timeout: 4000 })
  }).toPass({ timeout: 45000 })
}

/** The rendered image of one card — user-visible truth, not a shape prop. */
function cardImage(page: Page, shapeId: string) {
  return shapeLocator(page, shapeId).locator('img')
}

/** Poll the PERSISTED snapshot until the shape carries the override. Then a reload means something. */
async function expectPersistedOverride(
  page: Page,
  campaignId: string,
  diagramId: string,
  shapeId: string,
  imageId: string | null,
) {
  type Store = Record<string, { props?: Record<string, unknown> }>
  await expect(async () => {
    const res = (await apiFetch(
      page,
      `/api/campaigns/${campaignId}/diagrams/${diagramId}/snapshot`,
    )) as { snapshot?: { store?: Store; document?: { store?: Store } } }
    // Two shapes of snapshot are in play and BOTH are legitimate: a hand-written
    // `{ store, schema }` (what this file PUTs, and what the app's own older snapshots look like)
    // and tldraw's `getSnapshot()` form, `{ document: { store, schema }, session }`, which is what
    // the app saves. Reading only the first one reports "nothing was persisted" about a snapshot
    // that persisted perfectly — measured while writing this test.
    const store = res?.snapshot?.document?.store ?? res?.snapshot?.store ?? {}
    const stored = store[shapeId]?.props?.imageOverrideId ?? null
    expect(stored).toBe(imageId)
  }).toPass({ timeout: 25000 })
}

/** Ask the page to flush its debounced save rather than sleeping through the debounce. */
async function saveDiagramNow(page: Page) {
  const btn = page.locator('[data-testid="save-diagram-btn"]')
  if (await btn.isVisible().catch(() => false)) await btn.click()
}

const picker = (page: Page) => page.locator('[data-testid="entity-popover-image-picker"]')
const pickerOptions = (page: Page) => page.locator('[data-testid="entity-popover-image-option"]')
const pickerOption = (page: Page, imageId: string) =>
  page.locator(`[data-testid="entity-popover-image-option"][data-image-id="${imageId}"]`)

test.describe('Per-shape diagram card image', () => {
  // Registration + campaign + two uploads + a canvas load do not fit the 45s default.
  test.setTimeout(180000)

  test('3.4 an object gains a second photograph and its card can then be switched to it', async ({
    page,
  }) => {
    const campaignId = await setupDmCampaign(page, 'Objeto')
    const item = await createItem(page, campaignId, `El traje de oro ${uid()}`)

    // --- The gallery half: an OBJECT holding more than one photograph, through the UI.
    await page.goto(`${BASE}/campaigns/${campaignId}/entities/${item.slug}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('gallery-upload')).toBeVisible({ timeout: 90000 })
    await expect(page.getByTestId('gallery-item')).toHaveCount(0)

    await uploadViaGalleryUi(page, 'traje-frontal.png')
    await expect(page.getByTestId('gallery-item')).toHaveCount(1)
    await uploadViaGalleryUi(page, 'traje-detalle.png')
    await expect(page.getByTestId('gallery-item')).toHaveCount(2)
    // Exactly one primary, and it is the FIRST photograph — a second upload must not displace it.
    await expect(page.getByTestId('gallery-primary-badge')).toHaveCount(1)
    await expect(
      page.getByTestId('gallery-item').first().getByTestId('gallery-primary-badge'),
    ).toBeVisible()

    const gallery = await listGallery(page, campaignId, item.slug)
    expect(gallery).toHaveLength(2)
    const primary = gallery.find((g) => g.isPrimary)!
    const other = gallery.find((g) => !g.isPrimary)!
    expect(primary.id).toBe(gallery[0]!.id)
    expect(other.url).not.toBe(primary.url)

    // --- The diagram half: one card of that object, dropped with no override.
    const diagram = await createDiagram(page, campaignId, 'Diagrama del traje')
    await putSnapshot(
      page,
      campaignId,
      diagram.id,
      snapshotWithCards(campaignId, [
        {
          shapeId: 'shape:trajecard',
          entityId: item.id,
          slug: item.slug,
          name: item.name,
          x: 260,
          y: 160,
        },
      ]),
    )

    await openDiagram(page, campaignId, diagram.id)
    // Hydration gives the fresh card the entity's primary photograph.
    await expect(cardImage(page, 'shape:trajecard')).toHaveAttribute('src', primary.url, {
      timeout: 30000,
    })

    // --- Pick the other photograph for THIS card.
    await openCardPreview(page, 'shape:trajecard')
    await expect(picker(page)).toBeVisible({ timeout: 15000 })
    await expect(pickerOptions(page)).toHaveCount(2)

    await pickerOption(page, other.id).click()
    await expect(cardImage(page, 'shape:trajecard')).toHaveAttribute('src', other.url, {
      timeout: 15000,
    })
    // The chosen one is now marked as the one in force, and the other is not.
    await expect(pickerOption(page, other.id)).toHaveAttribute('data-selected', 'true')
    await expect(pickerOption(page, primary.id)).toHaveAttribute('data-selected', 'false')
    // And a way back to the entity's own main photograph appears.
    await expect(page.locator('[data-testid="entity-popover-image-reset"]')).toBeVisible()

    // --- It persists, and survives the reload that used to revert it.
    await saveDiagramNow(page)
    await expectPersistedOverride(page, campaignId, diagram.id, 'shape:trajecard', other.id)

    await openDiagram(page, campaignId, diagram.id)
    await expect(cardImage(page, 'shape:trajecard')).toHaveAttribute('src', other.url, {
      timeout: 30000,
    })
    // And it is a real image, not a broken one.
    expect(
      await cardImage(page, 'shape:trajecard').evaluate(
        (el) => (el as HTMLImageElement).naturalWidth,
      ),
    ).toBeGreaterThan(0)

    // --- Choosing a card image must NOT touch the object's own main photograph.
    const galleryAfter = await listGallery(page, campaignId, item.slug)
    expect(galleryAfter.find((g) => g.isPrimary)!.id).toBe(primary.id)
    const entityAfter = (await apiFetch(
      page,
      `/api/campaigns/${campaignId}/entities/${item.slug}`,
    )) as { imageUrl?: string | null }
    expect(entityAfter.imageUrl).toBe(primary.url)
  })

  /**
   * The picker marks the image the card is ACTUALLY showing, and clicking that mark is inert.
   *
   * Two requirements that only make sense together, which is why they share a test. The spec wants
   * the gallery offered "with the one currently shown marked", and the state every card starts in
   * is: no override, showing the entity's primary. Marking by the shape's override alone left that
   * state with zero marks — the only state a reader ever sees first.
   *
   * Fixing that opened a second hole, and the second half of this test is the one that guards it:
   * once the primary IS marked, a click on it must write nothing. If it stored an override pinning
   * the primary, the card would silently stop following the entity's main image — for ever, and
   * invisibly, because at that instant the card looks exactly right. So the proof is not "no
   * override was saved" (true but internal) — it is that the card still FOLLOWS a change of the
   * entity's main photograph afterwards.
   */
  test('3.6 the picker marks the image the card shows, and clicking that mark writes nothing', async ({
    page,
  }) => {
    const campaignId = await setupDmCampaign(page, 'Marcada')
    const item = await createItem(page, campaignId, `La llave marcada ${uid()}`)

    await page.goto(`${BASE}/campaigns/${campaignId}/entities/${item.slug}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('gallery-upload')).toBeVisible({ timeout: 90000 })
    await uploadViaGalleryUi(page, 'llave-a.png')
    await expect(page.getByTestId('gallery-item')).toHaveCount(1)
    await uploadViaGalleryUi(page, 'llave-b.png')
    await expect(page.getByTestId('gallery-item')).toHaveCount(2)

    const gallery = await listGallery(page, campaignId, item.slug)
    const primary = gallery.find((g) => g.isPrimary)!
    const other = gallery.find((g) => !g.isPrimary)!

    const diagram = await createDiagram(page, campaignId, 'Llave')
    await putSnapshot(
      page,
      campaignId,
      diagram.id,
      snapshotWithCards(campaignId, [
        {
          shapeId: 'shape:llavecard',
          entityId: item.id,
          slug: item.slug,
          name: item.name,
          x: 260,
          y: 160,
        },
      ]),
    )

    await openDiagram(page, campaignId, diagram.id)
    // The card is demonstrably showing the primary...
    await expect(cardImage(page, 'shape:llavecard')).toHaveAttribute('src', primary.url, {
      timeout: 30000,
    })
    await openCardPreview(page, 'shape:llavecard')
    await expect(picker(page)).toBeVisible({ timeout: 15000 })
    await expect(pickerOptions(page)).toHaveCount(2)

    // ...so the primary is the one marked, and it is the ONLY one marked. The count matters: a
    // picker that marked everything would satisfy a bare "the primary is marked" assertion.
    await expect(pickerOption(page, primary.id)).toHaveAttribute('data-selected', 'true', {
      timeout: 10000,
    })
    await expect(pickerOption(page, other.id)).toHaveAttribute('data-selected', 'false')
    await expect(
      page.locator('[data-testid="entity-popover-image-option"][data-selected="true"]'),
    ).toHaveCount(1)
    // Nothing to reset: this card has no override, and offering "use the main image" here would
    // claim there is something to undo.
    await expect(page.locator('[data-testid="entity-popover-image-reset"]')).toHaveCount(0)

    // --- Clicking the already-marked thumbnail. Nothing may change.
    await pickerOption(page, primary.id).click()
    await page.waitForTimeout(1500)
    await expect(cardImage(page, 'shape:llavecard')).toHaveAttribute('src', primary.url)
    await expect(pickerOption(page, primary.id)).toHaveAttribute('data-selected', 'true')
    // If an override had been stored, this button would have appeared: it renders on the shape's
    // override, not on the marking.
    await expect(page.locator('[data-testid="entity-popover-image-reset"]')).toHaveCount(0)
    await saveDiagramNow(page)
    await expectPersistedOverride(page, campaignId, diagram.id, 'shape:llavecard', null)

    // --- The decisive half: the entity gets a THIRD photograph, promoted to main. A card with no
    // override must follow it. It could not if that click had pinned the old primary.
    await page.goto(`${BASE}/campaigns/${campaignId}/entities/${item.slug}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('gallery-upload')).toBeVisible({ timeout: 90000 })
    await uploadViaGalleryUi(page, 'llave-c.png')
    await expect(page.getByTestId('gallery-item')).toHaveCount(3)
    const withC = await listGallery(page, campaignId, item.slug)
    const imageC = withC.find((i) => i.id !== primary.id && i.id !== other.id)!
    await page.getByTestId('gallery-item').nth(2).getByTestId('gallery-set-main').click()
    await expect(
      page.getByTestId('gallery-item').nth(2).getByTestId('gallery-primary-badge'),
    ).toBeVisible()
    expect((await listGallery(page, campaignId, item.slug)).find((i) => i.isPrimary)!.id).toBe(
      imageC.id,
    )

    await openDiagram(page, campaignId, diagram.id)
    await expect(cardImage(page, 'shape:llavecard')).toHaveAttribute('src', imageC.url, {
      timeout: 30000,
    })
    // And the mark follows the shown image, on the new primary this time.
    await openCardPreview(page, 'shape:llavecard')
    await expect(picker(page)).toBeVisible({ timeout: 15000 })
    await expect(pickerOption(page, imageC.id)).toHaveAttribute('data-selected', 'true', {
      timeout: 10000,
    })
    await expect(
      page.locator('[data-testid="entity-popover-image-option"][data-selected="true"]'),
    ).toHaveCount(1)
  })

  test('3.1 two cards of one entity show different images, and a reload keeps them apart', async ({
    page,
  }) => {
    const campaignId = await setupDmCampaign(page, 'DosTarjetas')
    const item = await createItem(page, campaignId, `La daga doble ${uid()}`)

    await page.goto(`${BASE}/campaigns/${campaignId}/entities/${item.slug}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('gallery-upload')).toBeVisible({ timeout: 90000 })
    await uploadViaGalleryUi(page, 'daga-a.png')
    await expect(page.getByTestId('gallery-item')).toHaveCount(1)
    await uploadViaGalleryUi(page, 'daga-b.png')
    await expect(page.getByTestId('gallery-item')).toHaveCount(2)

    const gallery = await listGallery(page, campaignId, item.slug)
    const imageA = gallery.find((g) => g.isPrimary)!
    const imageB = gallery.find((g) => !g.isPrimary)!

    const diagram = await createDiagram(page, campaignId, 'Dos tarjetas')
    await putSnapshot(
      page,
      campaignId,
      diagram.id,
      snapshotWithCards(campaignId, [
        {
          shapeId: 'shape:cardone',
          entityId: item.id,
          slug: item.slug,
          name: item.name,
          x: 240,
          y: 120,
        },
        {
          shapeId: 'shape:cardtwo',
          entityId: item.id,
          slug: item.slug,
          name: item.name,
          x: 240,
          y: 320,
        },
      ]),
    )

    await openDiagram(page, campaignId, diagram.id)
    // Both start on the primary.
    await expect(cardImage(page, 'shape:cardone')).toHaveAttribute('src', imageA.url, {
      timeout: 30000,
    })
    await expect(cardImage(page, 'shape:cardtwo')).toHaveAttribute('src', imageA.url)

    // Switch ONE of them.
    await openCardPreview(page, 'shape:cardone')
    await expect(picker(page)).toBeVisible({ timeout: 15000 })
    await pickerOption(page, imageB.id).click()

    await expect(cardImage(page, 'shape:cardone')).toHaveAttribute('src', imageB.url, {
      timeout: 15000,
    })
    // The sibling card is untouched — the override is per shape, not per entity.
    await expect(cardImage(page, 'shape:cardtwo')).toHaveAttribute('src', imageA.url)

    await saveDiagramNow(page)
    await expectPersistedOverride(page, campaignId, diagram.id, 'shape:cardone', imageB.id)
    await expectPersistedOverride(page, campaignId, diagram.id, 'shape:cardtwo', null)

    // The reload is the real test: hydration used to overwrite both from the primary.
    await openDiagram(page, campaignId, diagram.id)
    await expect(cardImage(page, 'shape:cardone')).toHaveAttribute('src', imageB.url, {
      timeout: 30000,
    })
    await expect(cardImage(page, 'shape:cardtwo')).toHaveAttribute('src', imageA.url)

    // The entity's own main photograph did not move.
    const after = await listGallery(page, campaignId, item.slug)
    expect(after.find((g) => g.isPrimary)!.id).toBe(imageA.id)
    expect(after.filter((g) => g.isPrimary)).toHaveLength(1)

    // --- And now the other half of the rule: changing the entity's MAIN photograph still moves
    // every card that has no override, and leaves the overridden one alone. This phase is also what
    // makes the assertion above impossible to satisfy with a stale snapshot value: `cardtwo` has
    // image A baked into its saved props, so only hydration can turn it into C.
    await page.goto(`${BASE}/campaigns/${campaignId}/entities/${item.slug}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('gallery-upload')).toBeVisible({ timeout: 90000 })
    await uploadViaGalleryUi(page, 'daga-c.png')
    await expect(page.getByTestId('gallery-item')).toHaveCount(3)
    const withC = await listGallery(page, campaignId, item.slug)
    const imageC = withC.find((i) => i.id !== imageA.id && i.id !== imageB.id)!
    await page.getByTestId('gallery-item').nth(2).getByTestId('gallery-set-main').click()
    await expect(
      page.getByTestId('gallery-item').nth(2).getByTestId('gallery-primary-badge'),
    ).toBeVisible()
    const promoted = await listGallery(page, campaignId, item.slug)
    expect(promoted.find((i) => i.isPrimary)!.id).toBe(imageC.id)

    await openDiagram(page, campaignId, diagram.id)
    // The card with no override follows the new main photograph...
    await expect(cardImage(page, 'shape:cardtwo')).toHaveAttribute('src', imageC.url, {
      timeout: 30000,
    })
    // ...and the overridden one is unchanged.
    await expect(cardImage(page, 'shape:cardone')).toHaveAttribute('src', imageB.url)
  })

  /**
   * Regression for `fix-diagram-image-override-autosave-race`.
   *
   * Every OTHER reload-after-pick assertion in this file calls `saveDiagramNow()` first — a
   * deliberate flush of the debounce, done for test reliability. That is reasonable for a test,
   * but it means none of them ever exercised what a real user actually does: pick a thumbnail,
   * see the card change, and refresh — without knowing a manual "Guardar" button exists to flush
   * anything. `onPopoverSelectImage` used to leave persistence entirely to the generic 1-second
   * autosave debounce, so a reload inside that window silently discarded the choice: reproduced
   * against a real dev server, the persisted `imageOverrideId` was `undefined` immediately after
   * the click, with the PUT request having already completed successfully — the picker looked
   * like it worked and the write amounted to nothing.
   *
   * This test therefore does the OPPOSITE of every sibling above: no `saveDiagramNow()`, and no
   * wait beyond what the click and the reload themselves take.
   */
  test('3.8 a picked image survives an immediate reload with no manual save', async ({ page }) => {
    const campaignId = await setupDmCampaign(page, 'SinGuardarManual')
    const item = await createItem(page, campaignId, `El farol sin guardar ${uid()}`)

    await page.goto(`${BASE}/campaigns/${campaignId}/entities/${item.slug}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('gallery-upload')).toBeVisible({ timeout: 90000 })
    await uploadViaGalleryUi(page, 'farol-a.png')
    await expect(page.getByTestId('gallery-item')).toHaveCount(1)
    await uploadViaGalleryUi(page, 'farol-b.png')
    await expect(page.getByTestId('gallery-item')).toHaveCount(2)

    const gallery = await listGallery(page, campaignId, item.slug)
    const primary = gallery.find((g) => g.isPrimary)!
    const other = gallery.find((g) => !g.isPrimary)!

    const diagram = await createDiagram(page, campaignId, 'Farol sin guardar')
    await putSnapshot(
      page,
      campaignId,
      diagram.id,
      snapshotWithCards(campaignId, [
        {
          shapeId: 'shape:farolcard',
          entityId: item.id,
          slug: item.slug,
          name: item.name,
          x: 260,
          y: 160,
        },
      ]),
    )

    await openDiagram(page, campaignId, diagram.id)
    await expect(cardImage(page, 'shape:farolcard')).toHaveAttribute('src', primary.url, {
      timeout: 30000,
    })

    await openCardPreview(page, 'shape:farolcard')
    await expect(picker(page)).toBeVisible({ timeout: 15000 })
    await pickerOption(page, other.id).click()
    await expect(cardImage(page, 'shape:farolcard')).toHaveAttribute('src', other.url, {
      timeout: 15000,
    })

    // No saveDiagramNow(). No wait. Straight to the reload — exactly what the report described.
    await openDiagram(page, campaignId, diagram.id)
    await expect(cardImage(page, 'shape:farolcard')).toHaveAttribute('src', other.url, {
      timeout: 30000,
    })

    // The persisted snapshot itself must carry the override, not just the render — a stale
    // client-side render before hydration re-applies is exactly the trap this file's own
    // `openDiagram` helper exists to avoid (see its docstring).
    await expectPersistedOverride(page, campaignId, diagram.id, 'shape:farolcard', other.id)

    // And the popover must agree: the reset control is offered, and the chosen image is marked.
    await openCardPreview(page, 'shape:farolcard')
    await expect(picker(page)).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="entity-popover-image-reset"]')).toBeVisible()
    await expect(pickerOption(page, other.id)).toHaveAttribute('data-selected', 'true')
    await expect(pickerOption(page, primary.id)).toHaveAttribute('data-selected', 'false')
  })

  test('3.2 a card whose overridden image was deleted falls back to the primary', async ({
    page,
  }) => {
    const campaignId = await setupDmCampaign(page, 'Borrada')
    const item = await createItem(page, campaignId, `El espejo roto ${uid()}`)

    await page.goto(`${BASE}/campaigns/${campaignId}/entities/${item.slug}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('gallery-upload')).toBeVisible({ timeout: 90000 })
    await uploadViaGalleryUi(page, 'espejo-a.png')
    await expect(page.getByTestId('gallery-item')).toHaveCount(1)
    await uploadViaGalleryUi(page, 'espejo-b.png')
    await expect(page.getByTestId('gallery-item')).toHaveCount(2)

    const gallery = await listGallery(page, campaignId, item.slug)
    const imageA = gallery.find((g) => g.isPrimary)!
    const imageB = gallery.find((g) => !g.isPrimary)!

    // A diagram already saved with the card pointing at image B, exactly as the picker leaves it.
    const diagram = await createDiagram(page, campaignId, 'Espejo')
    await putSnapshot(
      page,
      campaignId,
      diagram.id,
      snapshotWithCards(campaignId, [
        {
          shapeId: 'shape:espejocard',
          entityId: item.id,
          slug: item.slug,
          name: item.name,
          x: 260,
          y: 160,
          portraitUrl: imageB.url,
          imageOverrideId: imageB.id,
        },
      ]),
    )

    // Control: the override really is in force before the deletion, otherwise the fallback
    // assertion below would pass for the wrong reason.
    await openDiagram(page, campaignId, diagram.id)
    await expect(cardImage(page, 'shape:espejocard')).toHaveAttribute('src', imageB.url, {
      timeout: 30000,
    })

    // Now delete that image.
    await apiFetch(page, `/api/campaigns/${campaignId}/entities/${item.slug}/images/${imageB.id}`, {
      method: 'DELETE',
    })
    const afterDelete = await listGallery(page, campaignId, item.slug)
    expect(afterDelete.map((g) => g.id)).toEqual([imageA.id])

    await openDiagram(page, campaignId, diagram.id)
    // Degrades to the primary...
    await expect(cardImage(page, 'shape:espejocard')).toHaveAttribute('src', imageA.url, {
      timeout: 30000,
    })
    // ...and is a real, decoded image. A broken <img> keeps its src, so the src alone is not
    // enough to prove "no broken image".
    await expect(async () => {
      const decoded = await cardImage(page, 'shape:espejocard').evaluate(
        (el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0,
      )
      expect(decoded).toBe(true)
    }).toPass({ timeout: 15000 })

    // The stale override may remain stored — the spec allows it — but the picker must show the
    // primary as the one in force, because that is what the reader sees.
    await openCardPreview(page, 'shape:espejocard')
    // One image left: no choice to make, so no picker.
    await expect(picker(page)).toHaveCount(0)
  })

  test('3.3 a read-only viewer is offered no picker on a card a DM can change', async ({
    browser,
  }) => {
    const dmContext = await browser.newContext()
    const dmPage = await dmContext.newPage()
    const campaignId = await setupDmCampaign(dmPage, 'SoloLectura')
    const item = await createItem(dmPage, campaignId, `El sello de plomo ${uid()}`)

    await dmPage.goto(`${BASE}/campaigns/${campaignId}/entities/${item.slug}`, {
      waitUntil: 'domcontentloaded',
    })
    await dmPage.waitForLoadState('networkidle')
    await expect(dmPage.getByTestId('gallery-upload')).toBeVisible({ timeout: 90000 })
    await uploadViaGalleryUi(dmPage, 'sello-a.png')
    await expect(dmPage.getByTestId('gallery-item')).toHaveCount(1)
    await uploadViaGalleryUi(dmPage, 'sello-b.png')
    await expect(dmPage.getByTestId('gallery-item')).toHaveCount(2)

    const gallery = await listGallery(dmPage, campaignId, item.slug)
    expect(gallery).toHaveLength(2)
    const primary = gallery.find((g) => g.isPrimary)!

    const diagram = await createDiagram(dmPage, campaignId, 'Sello')
    await putSnapshot(
      dmPage,
      campaignId,
      diagram.id,
      snapshotWithCards(campaignId, [
        {
          shapeId: 'shape:sellocard',
          entityId: item.id,
          slug: item.slug,
          name: item.name,
          x: 260,
          y: 160,
        },
      ]),
    )

    // POSITIVE CONTROL, same diagram and same shape: the DM does get the picker. Without this, the
    // viewer's `toHaveCount(0)` below would pass even against a selector that never renders at all.
    await openDiagram(dmPage, campaignId, diagram.id)
    await expect(cardImage(dmPage, 'shape:sellocard')).toHaveAttribute('src', primary.url, {
      timeout: 30000,
    })
    await openCardPreview(dmPage, 'shape:sellocard')
    await expect(picker(dmPage)).toBeVisible({ timeout: 15000 })
    await expect(pickerOptions(dmPage)).toHaveCount(2)

    // SECOND POSITIVE CONTROL, and the reason it exists: a read-only tldraw canvas swallows a
    // shape's own `onDoubleClick`, so the viewer's double-click below can never reach the page at
    // all — measured, by removing BOTH of the app's read-only guards and finding this test still
    // green. A `toHaveCount(0)` proved by the canvas rather than by the guard is worthless. So the
    // viewer half also raises the preview event DIRECTLY, exactly as a shape does, and that path is
    // validated here first: the same event, with the same detail, does open the picker for a DM.
    await dmPage.locator('[data-testid="entity-popover-close"]').click()
    await expect(dmPage.locator('[data-testid="entity-popover"]')).toHaveCount(0)
    await dispatchPreviewEvent(dmPage, {
      entityId: item.id,
      campaignId,
      slug: item.slug,
      shapeId: 'shape:sellocard',
    })
    await expect(picker(dmPage)).toBeVisible({ timeout: 15000 })
    await expect(pickerOptions(dmPage)).toHaveCount(2)

    // A player joins. `player` is below `editor`, so the diagram opens read-only.
    const invite = (await apiFetch(dmPage, `/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      body: { role: 'player' },
    })) as { token: string }
    expect(invite.token).toBeTruthy()

    const viewerContext = await browser.newContext()
    const viewerPage = await viewerContext.newPage()
    await registerAndLogin(viewerPage, `Lector ${uid()}`)
    await waitForSession(viewerPage)
    await apiFetch(viewerPage, `/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      body: { token: invite.token },
    })

    // The read-only path opens the entity in a new tab instead of the popover; swallow it so the
    // popup does not become the thing under test.
    viewerPage.on('popup', (popup) => popup.close().catch(() => {}))

    await openDiagram(viewerPage, campaignId, diagram.id)
    // The viewer really is looking at the same card...
    await expect(cardImage(viewerPage, 'shape:sellocard')).toHaveAttribute('src', primary.url, {
      timeout: 30000,
    })
    // ...and the editing surface is absent for them.
    await expect(viewerPage.locator('[data-testid="save-diagram-btn"]')).toHaveCount(0)

    // The user-level gesture: double-clicking the card offers nothing.
    await dblclickShape(viewerPage, 'shape:sellocard')
    await viewerPage.waitForTimeout(1500)
    await expect(picker(viewerPage)).toHaveCount(0)
    await expect(pickerOptions(viewerPage)).toHaveCount(0)

    // And the same preview event that opens the picker for the DM — validated above, so this is not
    // a malformed payload quietly doing nothing — reaches the page here and is refused: the whole
    // popover stays away, and with it the picker.
    await dispatchPreviewEvent(viewerPage, {
      entityId: item.id,
      campaignId,
      slug: item.slug,
      shapeId: 'shape:sellocard',
    })
    await viewerPage.waitForTimeout(1500)
    await expect(viewerPage.locator('[data-testid="entity-popover"]')).toHaveCount(0)
    await expect(picker(viewerPage)).toHaveCount(0)
    await expect(pickerOptions(viewerPage)).toHaveCount(0)

    await viewerContext.close()
    await dmContext.close()
  })

  /**
   * Spec requirement "An organization card refreshes its crest" (design D7), the OVERRIDE half.
   *
   * The primary half is broken today and is declared separately below (3.5x). So this test
   * deliberately asserts NOTHING about the card before a crest is picked: an organization card
   * with no override currently renders no image at all, and asserting that state here would pin
   * the bug in place — the failure mode this repo has recorded nine times.
   */
  test('3.5 an organization card can be given a crest per card, and keeps it', async ({ page }) => {
    const campaignId = await setupDmCampaign(page, 'Estandarte')
    const org = (await apiFetch(page, `/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      body: { name: `Ordo Novus ${uid()}`, description: 'Una facción con estandartes.' },
    })) as { id: string; slug: string; name: string }

    // The organization's own gallery page (its route, not the generic entity one).
    await page.goto(`${BASE}/campaigns/${campaignId}/organizations/${org.slug}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('gallery-upload')).toBeVisible({ timeout: 90000 })
    await uploadViaGalleryUi(page, 'estandarte-a.png')
    await expect(page.getByTestId('gallery-item')).toHaveCount(1)
    await uploadViaGalleryUi(page, 'estandarte-b.png')
    await expect(page.getByTestId('gallery-item')).toHaveCount(2)

    const gallery = (await apiFetch(
      page,
      `/api/campaigns/${campaignId}/organizations/${org.slug}/images`,
    )) as GalleryImage[]
    expect(gallery).toHaveLength(2)
    const crestA = gallery.find((g) => g.isPrimary)!
    const crestB = gallery.find((g) => !g.isPrimary)!

    // A faction card as the palette drops one: the crest it was dropped with, no override.
    // `entities.id === organizations.id` for a freshly created organization, so this is the id
    // every downstream reader (batch, hydration, the picker) is keyed on.
    const diagram = await createDiagram(page, campaignId, 'Estandartes')
    await apiFetch(page, `/api/campaigns/${campaignId}/diagrams/${diagram.id}/snapshot`, {
      method: 'PUT',
      body: {
        store: {
          'document:document': {
            id: 'document:document',
            typeName: 'document',
            gridSize: 10,
            name: '',
            meta: {},
          },
          'page:page': {
            id: 'page:page',
            typeName: 'page',
            name: 'Page 1',
            index: 'a1',
            meta: {},
          },
          'shape:factioncard': {
            id: 'shape:factioncard',
            typeName: 'shape',
            type: 'factionCard',
            x: 260,
            y: 140,
            rotation: 0,
            isLocked: false,
            opacity: 1,
            meta: {},
            parentId: 'page:page',
            index: 'a1',
            props: {
              w: 140,
              h: 160,
              entityId: org.id,
              campaignId,
              slug: org.slug,
              factionName: org.name,
              crestUrl: crestA.url,
            },
          },
        },
        schema: { schemaVersion: 2, sequences: {} },
      },
    })

    await openDiagram(page, campaignId, diagram.id)
    // No assertion on the crest here — see 3.5x. Per-card choice works on this type regardless.
    await openCardPreview(page, 'shape:factioncard')
    await expect(picker(page)).toBeVisible({ timeout: 15000 })
    await pickerOption(page, crestB.id).click()
    await expect(cardImage(page, 'shape:factioncard')).toHaveAttribute('src', crestB.url, {
      timeout: 15000,
    })
    await saveDiagramNow(page)
    await expectPersistedOverride(page, campaignId, diagram.id, 'shape:factioncard', crestB.id)
    await openDiagram(page, campaignId, diagram.id)
    await expect(cardImage(page, 'shape:factioncard')).toHaveAttribute('src', crestB.url, {
      timeout: 30000,
    })

    // The assertion above is NOT enough on its own and the difference matters: the saved snapshot
    // already carries `crestUrl: <B>`, so the card would render B even if hydration ignored
    // `factionCard` entirely — which is precisely what it did before design D7. So save a snapshot
    // whose two fields DISAGREE (the override says B, the baked URL says A) — the shape a stale
    // client or an older save leaves behind — and require B. Only hydration resolving the override
    // for this shape type can produce that.
    await apiFetch(page, `/api/campaigns/${campaignId}/diagrams/${diagram.id}/snapshot`, {
      method: 'PUT',
      body: {
        store: {
          'document:document': {
            id: 'document:document',
            typeName: 'document',
            gridSize: 10,
            name: '',
            meta: {},
          },
          'page:page': {
            id: 'page:page',
            typeName: 'page',
            name: 'Page 1',
            index: 'a1',
            meta: {},
          },
          'shape:factioncard': {
            id: 'shape:factioncard',
            typeName: 'shape',
            type: 'factionCard',
            x: 260,
            y: 140,
            rotation: 0,
            isLocked: false,
            opacity: 1,
            meta: {},
            parentId: 'page:page',
            index: 'a1',
            props: {
              w: 140,
              h: 160,
              entityId: org.id,
              campaignId,
              slug: org.slug,
              factionName: org.name,
              crestUrl: crestA.url,
              imageOverrideId: crestB.id,
            },
          },
        },
        schema: { schemaVersion: 2, sequences: {} },
      },
    })
    await openDiagram(page, campaignId, diagram.id)
    await expect(cardImage(page, 'shape:factioncard')).toHaveAttribute('src', crestB.url, {
      timeout: 30000,
    })
  })

  /**
   * Spec requirement "An organization card refreshes its crest", the PRIMARY half — and the
   * regression that half used to be.
   *
   * `factionCard` is the only image-bearing shape whose main image lives in a different column
   * from every other type's: the gallery mirrors an organization's primary into
   * `organizations.image_url` (`syncPrimaryImageUrl`, kind `organization`), never into
   * `entities.image_url`. `batch` used to read only `characters.portrait_url ?? entities.image_url`,
   * so every organization's crest resolved to null, and once hydration started writing `crestUrl` a
   * null stopped meaning "leave the card alone" and started meaning "erase it" — persisted back
   * into the snapshot. It now resolves specialised-column-first, the same precedence
   * `server/services/maps.ts` already uses for map pins.
   *
   * THE FIXTURE IS THE POINT, so this test asserts it before asserting the behaviour: the
   * organization must be in the real state of all 109 organizations that have a crest —
   * `organizations.image_url` set, `entities.image_url` NULL. With both columns populated, NO
   * version of the resolution order can fail and the test would be affirming the bug. The two
   * preconditions are read through two different endpoints that each expose exactly one column:
   * the organization GET spreads its own row, and the ENTITY GET returns `entities.image_url` raw
   * (its only fallback is for `character`, not `organization`).
   */
  test('3.7 an organization card shows and follows the crest it has no override for', async ({
    page,
  }) => {
    const campaignId = await setupDmCampaign(page, 'EstandarteHeredado')
    const org = (await apiFetch(page, `/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      body: { name: `Ordo Perditus ${uid()}` },
    })) as { id: string; slug: string; name: string }

    await page.goto(`${BASE}/campaigns/${campaignId}/organizations/${org.slug}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('gallery-upload')).toBeVisible({ timeout: 90000 })
    await uploadViaGalleryUi(page, 'perdido-a.png')
    await expect(page.getByTestId('gallery-item')).toHaveCount(1)

    const gallery = (await apiFetch(
      page,
      `/api/campaigns/${campaignId}/organizations/${org.slug}/images`,
    )) as GalleryImage[]
    const crestA = gallery.find((g) => g.isPrimary)!

    // --- PRECONDITION: the real state of the 109. Asserted, not assumed.
    const orgRow = (await apiFetch(
      page,
      `/api/campaigns/${campaignId}/organizations/${org.slug}`,
    )) as { imageUrl?: string | null; entitySlug?: string | null }
    expect(orgRow.imageUrl).toBe(crestA.url) // organizations.image_url — set by the gallery
    const entityRow = (await apiFetch(
      page,
      `/api/campaigns/${campaignId}/entities/${orgRow.entitySlug ?? org.slug}`,
    )) as { type?: string; imageUrl?: string | null }
    expect(entityRow.type).toBe('organization')
    expect(entityRow.imageUrl ?? null).toBeNull() // entities.image_url — NULL, as on all 109

    const diagram = await createDiagram(page, campaignId, 'Estandarte heredado')
    const lostCrestSnapshot = (crestUrl: string) => ({
      store: {
        'document:document': {
          id: 'document:document',
          typeName: 'document',
          gridSize: 10,
          name: '',
          meta: {},
        },
        'page:page': {
          id: 'page:page',
          typeName: 'page',
          name: 'Page 1',
          index: 'a1',
          meta: {},
        },
        'shape:lostcrest': {
          id: 'shape:lostcrest',
          typeName: 'shape',
          type: 'factionCard',
          x: 260,
          y: 140,
          rotation: 0,
          isLocked: false,
          opacity: 1,
          meta: {},
          parentId: 'page:page',
          index: 'a1',
          props: {
            w: 140,
            h: 160,
            entityId: org.id,
            campaignId,
            slug: org.slug,
            factionName: org.name,
            // The crest the palette drops the card with. No override: this card must simply
            // follow the organization's main image.
            crestUrl,
          },
        },
      },
      schema: { schemaVersion: 2, sequences: {} },
    })
    await apiFetch(page, `/api/campaigns/${campaignId}/diagrams/${diagram.id}/snapshot`, {
      method: 'PUT',
      body: lostCrestSnapshot(crestA.url),
    })

    // Hydration must leave the crest in place, not erase it.
    await openDiagram(page, campaignId, diagram.id)
    await expect(cardImage(page, 'shape:lostcrest')).toHaveAttribute('src', crestA.url, {
      timeout: 30000,
    })
    expect(
      await cardImage(page, 'shape:lostcrest').evaluate(
        (el) => (el as HTMLImageElement).naturalWidth,
      ),
    ).toBeGreaterThan(0)

    // --- The spec's own scenario: change the organization's image, reopen, see the new crest.
    // The stored snapshot still says crest A, so only hydration can produce crest B here.
    await page.goto(`${BASE}/campaigns/${campaignId}/organizations/${org.slug}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('gallery-upload')).toBeVisible({ timeout: 90000 })
    await uploadViaGalleryUi(page, 'perdido-b.png')
    await expect(page.getByTestId('gallery-item')).toHaveCount(2)
    await page.getByTestId('gallery-item').nth(1).getByTestId('gallery-set-main').click()
    await expect(
      page.getByTestId('gallery-item').nth(1).getByTestId('gallery-primary-badge'),
    ).toBeVisible()
    const afterPromote = (await apiFetch(
      page,
      `/api/campaigns/${campaignId}/organizations/${org.slug}/images`,
    )) as GalleryImage[]
    const crestB = afterPromote.find((g) => g.isPrimary)!
    expect(crestB.id).not.toBe(crestA.id)
    // Still the state of the 109 after a promotion: the specialised column moved, the entity
    // column is still empty.
    const entityRowAfter = (await apiFetch(
      page,
      `/api/campaigns/${campaignId}/entities/${orgRow.entitySlug ?? org.slug}`,
    )) as { imageUrl?: string | null }
    expect(entityRowAfter.imageUrl ?? null).toBeNull()

    // Re-save the shape with the OLD crest baked in, exactly as it sits on disk today, so the
    // reload below cannot be satisfied by the stored value.
    await apiFetch(page, `/api/campaigns/${campaignId}/diagrams/${diagram.id}/snapshot`, {
      method: 'PUT',
      body: lostCrestSnapshot(crestA.url),
    })
    await openDiagram(page, campaignId, diagram.id)
    await expect(cardImage(page, 'shape:lostcrest')).toHaveAttribute('src', crestB.url, {
      timeout: 30000,
    })
  })
})
