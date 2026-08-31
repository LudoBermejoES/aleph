// @vitest-environment jsdom
/**
 * The per-card image picker, mounted for real.
 *
 * This exists because of a defect a source-level check could not see: the picker
 * marked `image.id === currentImageId`, and `currentImageId` is the shape's
 * OVERRIDE, which is null until somebody picks something. So in the state EVERY
 * card starts in — no override, showing the entity's primary — the picker offered
 * two options and marked NONE of them. Measured in the browser as 2 options /
 * 0 marked before the fix. The spec requires the gallery to be offered "with the
 * one currently shown marked", so this was a requirement failure, not polish, and
 * it lived in the only state a reader sees the first time.
 *
 * The second property here matters as much: marking the primary must NOT store an
 * override. If opening a popover (or clicking the already-marked thumbnail) wrote
 * `imageOverrideId`, that card would silently stop following the entity's main
 * image for ever — worse than the missing mark.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import EntityPopover from '../../../app/components/diagrams/EntityPopover.vue'

// `useRouter` is a Nuxt auto-import resolved to `#app/composables/router`, which
// needs a Nuxt instance. Mocking the module is what lets this component mount in a
// plain jsdom test; `vi.stubGlobal('useRouter', ...)` does NOT work, because the
// call is a real import rather than a global.
vi.mock('#app/composables/router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ params: {}, query: {} }),
}))

// Read the locale file rather than importing it: Nuxt i18n's vite plugin precompiles
// an imported JSON into message ASTs.
const es = JSON.parse(
  readFileSync(resolve(__dirname, '../../../i18n/locales/es.json'), 'utf-8'),
) as Record<string, unknown>
const i18n = createI18n({ legacy: false, locale: 'es', messages: { es } })

const IMG_A = { id: 'img-a', url: '/img/a.jpg' } // the primary
const IMG_B = { id: 'img-b', url: '/img/b.jpg' }

/** The `batch` response the picker and hydration share. */
function stubFetch(
  batch: { portraitUrl?: string | null; images?: { id: string; url: string }[] | null } | null,
) {
  vi.stubGlobal(
    '$fetch',
    vi.fn(async (url: string) => {
      if (String(url).includes('/diagrams/entities/batch')) return batch ? { e1: batch } : {}
      return { id: 'e1', name: 'Julia Kirchner', type: 'character', slug: 'julia-kirchner' }
    }),
  )
}

async function popover(props: Record<string, unknown> = {}) {
  const w = mount(EntityPopover, {
    props: {
      visible: true,
      entityId: 'e1',
      campaignId: 'c1',
      slug: 'julia-kirchner',
      x: 0,
      y: 0,
      shapeId: 'shape:one',
      canPickImage: true,
      currentImageId: null,
      ...props,
    },
    global: { plugins: [i18n], stubs: { Button: { template: '<button><slot /></button>' } } },
  })
  // Two awaited fetches (entity detail + gallery) then a render tick.
  await new Promise((r) => setTimeout(r, 20))
  await w.vm.$nextTick()
  return w
}

const options = (w: Awaited<ReturnType<typeof popover>>) =>
  w.findAll('[data-testid="entity-popover-image-option"]')
const marked = (w: Awaited<ReturnType<typeof popover>>) =>
  options(w).filter((o) => o.attributes('data-selected') === 'true')
const reset = (w: Awaited<ReturnType<typeof popover>>) =>
  w.find('[data-testid="entity-popover-image-reset"]')

describe('EntityPopover image picker — what is marked', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    stubFetch({ portraitUrl: IMG_A.url, images: [IMG_A, IMG_B] })
  })

  it('marks the PRIMARY when the card has no override — the state every card starts in', async () => {
    const w = await popover({ currentImageId: null })
    expect(options(w)).toHaveLength(2)
    // The defect was exactly this count being 0.
    expect(marked(w)).toHaveLength(1)
    expect(marked(w)[0]!.attributes('data-image-id')).toBe('img-a')
  }, 30000)

  it('marks the override when the card has one', async () => {
    const w = await popover({ currentImageId: 'img-b' })
    expect(marked(w)).toHaveLength(1)
    expect(marked(w)[0]!.attributes('data-image-id')).toBe('img-b')
  }, 30000)

  it('marks the primary when the override no longer resolves, like hydration does', async () => {
    const w = await popover({ currentImageId: 'img-deleted' })
    expect(marked(w)).toHaveLength(1)
    expect(marked(w)[0]!.attributes('data-image-id')).toBe('img-a')
  }, 30000)

  it('marks nothing when what is on screen is not in the gallery at all', async () => {
    // An entity whose `image_url` was set directly, with no `entity_images` row:
    // marking a thumbnail that is NOT what the card shows would be a lie.
    stubFetch({ portraitUrl: '/img/not-in-gallery.jpg', images: [IMG_A, IMG_B] })
    const w = await popover({ currentImageId: null })
    expect(options(w)).toHaveLength(2)
    expect(marked(w)).toHaveLength(0)
  }, 30000)

  it('exposes exactly one marked option, never several', async () => {
    stubFetch({
      portraitUrl: IMG_A.url,
      images: [IMG_A, IMG_B, { id: 'img-c', url: '/img/c.jpg' }],
    })
    const w = await popover({ currentImageId: 'img-c' })
    expect(options(w)).toHaveLength(3)
    expect(marked(w)).toHaveLength(1)
  }, 30000)
})

describe('EntityPopover image picker — marking never writes', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    stubFetch({ portraitUrl: IMG_A.url, images: [IMG_A, IMG_B] })
  })

  it('emits nothing at all when it merely opens', async () => {
    const w = await popover({ currentImageId: null })
    // If opening stored an override pinning the primary, this card would stop
    // following the entity's main image for ever, with nobody having asked.
    expect(w.emitted('selectImage')).toBeUndefined()
  }, 30000)

  it('emits nothing when the already-shown (primary) thumbnail is clicked', async () => {
    const w = await popover({ currentImageId: null })
    await marked(w)[0]!.trigger('click')
    expect(w.emitted('selectImage')).toBeUndefined()
  }, 30000)

  it('emits nothing when the already-shown OVERRIDE thumbnail is clicked', async () => {
    const w = await popover({ currentImageId: 'img-b' })
    await marked(w)[0]!.trigger('click')
    expect(w.emitted('selectImage')).toBeUndefined()
  }, 30000)

  it('emits once, with the shape id and the chosen url, on a real change', async () => {
    const w = await popover({ currentImageId: null })
    const other = options(w).find((o) => o.attributes('data-image-id') === 'img-b')!
    await other.trigger('click')
    expect(w.emitted('selectImage')).toHaveLength(1)
    expect(w.emitted('selectImage')![0]).toEqual(['shape:one', 'img-b', '/img/b.jpg'])
  }, 30000)
})

describe('EntityPopover image picker — the reset affordance', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    stubFetch({ portraitUrl: IMG_A.url, images: [IMG_A, IMG_B] })
  })

  it('is hidden with no override: the primary is already what is shown', async () => {
    // Deliberate: with the primary correctly marked there is nothing to reset, and a
    // button that writes an override to the image already on screen would be the
    // very trap the tests above guard.
    const w = await popover({ currentImageId: null })
    expect(reset(w).exists()).toBe(false)
  }, 30000)

  it('is offered when an override exists, and clears it back to the primary', async () => {
    const w = await popover({ currentImageId: 'img-b' })
    expect(reset(w).exists()).toBe(true)
    await reset(w).trigger('click')
    expect(w.emitted('selectImage')![0]).toEqual(['shape:one', null, '/img/a.jpg'])
  }, 30000)

  it('is offered when the override is stale, so the reader can clear it', async () => {
    const w = await popover({ currentImageId: 'img-deleted' })
    expect(reset(w).exists()).toBe(true)
  }, 30000)
})

describe('EntityPopover image picker — when it is not offered', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders no picker at all for a read-only viewer', async () => {
    stubFetch({ portraitUrl: IMG_A.url, images: [IMG_A, IMG_B] })
    const w = await popover({ canPickImage: false })
    expect(options(w)).toHaveLength(0)
    expect(w.find('[data-testid="entity-popover-image-picker"]').exists()).toBe(false)
  }, 30000)

  it('renders no picker with a single image: nothing to switch to', async () => {
    stubFetch({ portraitUrl: IMG_A.url, images: [IMG_A] })
    const w = await popover()
    expect(w.find('[data-testid="entity-popover-image-picker"]').exists()).toBe(false)
  }, 30000)

  it('renders no picker when the server sends no gallery (contract half absent)', async () => {
    stubFetch({ portraitUrl: IMG_A.url })
    const w = await popover()
    expect(w.find('[data-testid="entity-popover-image-picker"]').exists()).toBe(false)
  }, 30000)
})
