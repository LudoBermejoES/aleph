/**
 * The per-shape image override (add-per-shape-diagram-image, workstream 2).
 *
 * The load-bearing behaviour is NOT the picker: `diagram-hydration.ts` used to
 * rewrite every card's image from the entity's primary on every diagram load, so
 * a chosen image was silently reverted on the next load and the reversion read as
 * a failed save. These tests assert the resolution RULE (design D2), not the
 * implementation that happens to produce it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  hydrateEntityShapes,
  resolveShapeImageUrl,
  resolveShownImageId,
} from '../../../app/utils/diagram-hydration'
import {
  buildShapeCreateArgs,
  getShapeImagePropKey,
  supportsImageOverride,
  SHAPE_IMAGE_PROP_KEY,
} from '../../../app/utils/diagram-shapes'

const IMG_A = { id: 'img-a', url: '/img/a.jpg' }
const IMG_B = { id: 'img-b', url: '/img/b.jpg' }

function entity(over: Record<string, unknown> = {}) {
  return {
    id: 'e1',
    name: 'Julia Kirchner',
    type: 'character',
    slug: 'julia-kirchner',
    portraitUrl: IMG_A.url,
    tags: [],
    status: 'alive',
    images: [IMG_A, IMG_B],
    ...over,
  }
}

function stubBatch(payload: Record<string, unknown>) {
  const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => payload })
  vi.stubGlobal('fetch', mockFetch)
  return mockFetch
}

// ---------------------------------------------------------------------------
// The rule, as a pure function
// ---------------------------------------------------------------------------

describe('resolveShapeImageUrl', () => {
  it('resolves an override that is present in the gallery', () => {
    expect(resolveShapeImageUrl({ portraitUrl: IMG_A.url, images: [IMG_A, IMG_B] }, 'img-b')).toBe(
      '/img/b.jpg',
    )
  })

  it('falls back to the primary when no override is set', () => {
    for (const unset of [undefined, null, '']) {
      expect(resolveShapeImageUrl({ portraitUrl: IMG_A.url, images: [IMG_A, IMG_B] }, unset)).toBe(
        '/img/a.jpg',
      )
    }
  })

  it('falls back to the primary when the override no longer resolves (deleted image)', () => {
    // A deleted image MUST degrade to the primary, never to a broken image, and
    // the stale override may stay stored.
    expect(resolveShapeImageUrl({ portraitUrl: IMG_A.url, images: [IMG_A] }, 'img-deleted')).toBe(
      '/img/a.jpg',
    )
  })

  it('falls back to the primary when the endpoint sends no gallery at all', () => {
    // The server half is optional by contract: without `images` the behaviour is
    // exactly today's.
    expect(resolveShapeImageUrl({ portraitUrl: IMG_A.url }, 'img-b')).toBe('/img/a.jpg')
    expect(resolveShapeImageUrl({ portraitUrl: IMG_A.url, images: null }, 'img-b')).toBe(
      '/img/a.jpg',
    )
  })

  it('returns undefined, not null, when there is no image anywhere', () => {
    // tldraw props are optional strings; null would fail the T.optional(T.string)
    // validator on the next store write.
    expect(resolveShapeImageUrl({ portraitUrl: null, images: [] }, undefined)).toBeUndefined()
    expect(resolveShapeImageUrl({ portraitUrl: null, images: [] }, 'img-b')).toBeUndefined()
  })

  it('ignores a non-string override instead of throwing', () => {
    expect(resolveShapeImageUrl({ portraitUrl: IMG_A.url, images: [IMG_A] }, 42)).toBe('/img/a.jpg')
    expect(resolveShapeImageUrl({ portraitUrl: IMG_A.url, images: [IMG_A] }, {})).toBe('/img/a.jpg')
  })
})

// ---------------------------------------------------------------------------
// Hydration: the same rule, through the real loop
// ---------------------------------------------------------------------------

describe('hydrateEntityShapes and the image override', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('does NOT overwrite a valid override with the primary', async () => {
    stubBatch({ e1: entity() })
    const updateShapes = vi.fn()
    await hydrateEntityShapes(
      {
        getCurrentPageShapes: () => [
          {
            id: 'shape-1',
            type: 'npcToken',
            props: { entityId: 'e1', campaignId: 'c1', imageOverrideId: 'img-b' },
          },
        ],
        updateShapes,
      },
      'c1',
    )
    const props = updateShapes.mock.calls[0]![0][0].props
    expect(props.portraitUrl).toBe('/img/b.jpg')
  })

  it('two shapes of ONE entity resolve independently', async () => {
    stubBatch({ e1: entity() })
    const updateShapes = vi.fn()
    await hydrateEntityShapes(
      {
        getCurrentPageShapes: () => [
          {
            id: 'shape-1',
            type: 'npcToken',
            props: { entityId: 'e1', campaignId: 'c1', imageOverrideId: 'img-b' },
          },
          { id: 'shape-2', type: 'npcToken', props: { entityId: 'e1', campaignId: 'c1' } },
        ],
        updateShapes,
      },
      'c1',
    )
    const updates = updateShapes.mock.calls[0]![0] as {
      id: string
      props: Record<string, unknown>
    }[]
    expect(updates.map((u) => [u.id, u.props.portraitUrl])).toEqual([
      ['shape-1', '/img/b.jpg'],
      ['shape-2', '/img/a.jpg'],
    ])
  })

  it('an overridden card ignores a change of primary, an un-overridden one follows it', async () => {
    // The primary has moved to B on the server; the overridden card points at A.
    stubBatch({ e1: entity({ portraitUrl: IMG_B.url }) })
    const updateShapes = vi.fn()
    await hydrateEntityShapes(
      {
        getCurrentPageShapes: () => [
          {
            id: 'pinned',
            type: 'npcToken',
            props: { entityId: 'e1', campaignId: 'c1', imageOverrideId: 'img-a' },
          },
          { id: 'following', type: 'npcToken', props: { entityId: 'e1', campaignId: 'c1' } },
        ],
        updateShapes,
      },
      'c1',
    )
    const updates = updateShapes.mock.calls[0]![0] as {
      id: string
      props: Record<string, unknown>
    }[]
    expect(updates.map((u) => u.props.portraitUrl)).toEqual(['/img/a.jpg', '/img/b.jpg'])
  })

  it('a deleted overridden image degrades to the primary', async () => {
    stubBatch({ e1: entity({ images: [IMG_A] }) })
    const updateShapes = vi.fn()
    await hydrateEntityShapes(
      {
        getCurrentPageShapes: () => [
          {
            id: 'shape-1',
            type: 'entityCard',
            props: { entityId: 'e1', campaignId: 'c1', imageOverrideId: 'img-b' },
          },
        ],
        updateShapes,
      },
      'c1',
    )
    expect(updateShapes.mock.calls[0]![0][0].props.portraitUrl).toBe('/img/a.jpg')
  })

  it('resolves the override into each shape type own image prop', async () => {
    stubBatch({ e1: entity() })
    const updateShapes = vi.fn()
    await hydrateEntityShapes(
      {
        getCurrentPageShapes: () =>
          ['npcToken', 'entityCard', 'locationPin', 'factionCard'].map((type) => ({
            id: `shape-${type}`,
            type,
            props: { entityId: 'e1', campaignId: 'c1', imageOverrideId: 'img-b' },
          })),
        updateShapes,
      },
      'c1',
    )
    const updates = updateShapes.mock.calls[0]![0] as {
      id: string
      props: Record<string, unknown>
    }[]
    expect(updates.map((u) => u.props[getShapeImagePropKey(u.id.slice('shape-'.length))!])).toEqual(
      ['/img/b.jpg', '/img/b.jpg', '/img/b.jpg', '/img/b.jpg'],
    )
  })

  it('refreshes a factionCard crest, which hydration never used to touch (D7)', async () => {
    stubBatch({ 'org-1': entity({ id: 'org-1', name: 'Ordo Novus', type: 'organization' }) })
    const updateShapes = vi.fn()
    await hydrateEntityShapes(
      {
        getCurrentPageShapes: () => [
          {
            id: 'shape-org',
            type: 'factionCard',
            props: { entityId: 'org-1', campaignId: 'c1', crestUrl: '/img/stale.jpg' },
          },
        ],
        updateShapes,
      },
      'c1',
    )
    expect(updateShapes).toHaveBeenCalledWith([
      { id: 'shape-org', props: { factionName: 'Ordo Novus', crestUrl: '/img/a.jpg' } },
    ])
  })

  it('leaves questNode alone: it renders no image, so it gets no image prop', async () => {
    stubBatch({ e1: entity({ type: 'quest', status: 'active' }) })
    const updateShapes = vi.fn()
    await hydrateEntityShapes(
      {
        getCurrentPageShapes: () => [
          {
            id: 'shape-q',
            type: 'questNode',
            props: { entityId: 'e1', campaignId: 'c1', imageOverrideId: 'img-b' },
          },
        ],
        updateShapes,
      },
      'c1',
    )
    expect(updateShapes).toHaveBeenCalledWith([
      { id: 'shape-q', props: { questTitle: 'Julia Kirchner', status: 'active' } },
    ])
  })
})

// ---------------------------------------------------------------------------
// The shared map, and the drop path
// ---------------------------------------------------------------------------

describe('SHAPE_IMAGE_PROP_KEY', () => {
  it('names the prop each shape actually renders its image from', () => {
    expect(SHAPE_IMAGE_PROP_KEY).toEqual({
      npcToken: 'portraitUrl',
      entityCard: 'portraitUrl',
      locationPin: 'locationImageUrl',
      factionCard: 'crestUrl',
    })
  })

  it('excludes shapes with no entity image', () => {
    for (const type of ['questNode', 'mapToken', 'anchorToken', 'stickyNote', 'regionBox']) {
      expect(supportsImageOverride(type)).toBe(false)
      expect(getShapeImagePropKey(type)).toBeUndefined()
    }
  })
})

describe('buildShapeCreateArgs and the override', () => {
  it('drops a card with no override, so it shows the primary', () => {
    const result = buildShapeCreateArgs(
      'character',
      { id: 'e1', name: 'Julia', slug: 'julia', portraitUrl: IMG_A.url },
      'c1',
    )
    expect(result.props.imageOverrideId).toBeUndefined()
    expect(result.props.portraitUrl).toBe(IMG_A.url)
  })

  it('carries an explicit override through when one is given', () => {
    const result = buildShapeCreateArgs(
      'location',
      { id: 'l1', name: 'Puerta', slug: 'puerta', portraitUrl: IMG_A.url },
      'c1',
      'img-b',
    )
    expect(result.props.imageOverrideId).toBe('img-b')
  })

  it('does not put the prop on a shape that cannot render an image', () => {
    const result = buildShapeCreateArgs(
      'quest',
      { id: 'q1', name: 'El Concilio', slug: 'el-concilio' },
      'c1',
      'img-b',
    )
    expect(result.type).toBe('questNode')
    expect('imageOverrideId' in result.props).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Which id a dropped shape stores
// ---------------------------------------------------------------------------

/**
 * The palette returns organizations and quests from their OWN tables:
 * `id` is an `organizations.id` / `quests.id`, and the entities-row id travels in a
 * separate `entityId` field. Everything a shape is later resolved against —
 * `diagrams/entities/batch`, hydration, the gallery — is keyed on `entities.id`.
 *
 * These fixtures make the two ids DIFFER on purpose. In the live database they
 * happen to be equal for all 290 organizations that have an `entities` row
 * (`entity_id = id`) and for all 193 quests (the mirror row shares the primary
 * key), and there is not one `factionCard` in any of the 82 stored snapshots — so
 * a test written against real data, or against the current shape of the palette
 * response, would pass while storing the wrong id. Nothing in the schema requires
 * the two columns to agree: `organizations.entity_id` is a separate nullable
 * column, so the guard is written against the divergent case.
 */
describe('buildShapeCreateArgs stores the entities-row id, not the source table id', () => {
  const ORG = {
    id: 'organizations-row-id',
    entityId: 'entities-row-id',
    name: 'Ordo Novus',
    slug: 'ordo-novus',
    portraitUrl: '/img/crest.jpg',
  }

  it('a dropped organization card carries the ENTITIES id', () => {
    const result = buildShapeCreateArgs('organization', ORG, 'c1')
    expect(result.type).toBe('factionCard')
    // If this ever reads 'organizations-row-id' again, `batch` resolves nothing for
    // the card: no crest refresh, no name refresh and no image picker, for ever.
    expect(result.props.entityId).toBe('entities-row-id')
    expect(result.props.entityId).not.toBe(ORG.id)
  })

  it('a dropped quest node carries the ENTITIES id', () => {
    // A questNode shows no image, so this is not about the picker: an unresolvable
    // entityId means its title and status never refresh either.
    const result = buildShapeCreateArgs(
      'quest',
      { id: 'quests-row-id', entityId: 'entities-row-id', name: 'El favor', slug: 'el-favor' },
      'c1',
    )
    expect(result.type).toBe('questNode')
    expect(result.props.entityId).toBe('entities-row-id')
  })

  it('falls back to the own id when there is no entities row (nullable column)', () => {
    // 7 of 297 organizations have entity_id NULL and no entities row at all. That
    // must degrade to today's behaviour, not throw and not store undefined.
    for (const missing of [null, undefined]) {
      const result = buildShapeCreateArgs('organization', { ...ORG, entityId: missing }, 'c1')
      expect(result.props.entityId).toBe('organizations-row-id')
    }
  })

  it('leaves a character or location alone: their palette id IS the entities id', () => {
    const char = buildShapeCreateArgs(
      'character',
      { id: 'entities-row-id', name: 'Julia', slug: 'julia' },
      'c1',
    )
    expect(char.props.entityId).toBe('entities-row-id')
    // The expansion path builds its payload without an `entityId` field at all
    // (useEntityExpansion passes { id, name, slug, image }), so it must be unaffected.
    const expanded = buildShapeCreateArgs(
      'location',
      { id: 'graph-node-id', name: 'Edificio Leeren', slug: 'edificio-leeren' },
      'c1',
    )
    expect(expanded.props.entityId).toBe('graph-node-id')
  })
})

// ---------------------------------------------------------------------------
// Which thumbnail the picker marks
// ---------------------------------------------------------------------------

/**
 * The id-shaped face of the same rule. It exists because the picker marked the
 * shape's OVERRIDE, which is null until somebody picks something, so a card in its
 * initial state (no override, showing the primary) had every thumbnail unmarked —
 * measured in the browser as 2 options / 0 marked, against a spec that requires
 * "the one currently shown marked".
 */
describe('resolveShownImageId', () => {
  it('is the primary id when there is no override', () => {
    for (const unset of [undefined, null, '']) {
      expect(resolveShownImageId([IMG_A, IMG_B], IMG_A.url, unset)).toBe('img-a')
    }
  })

  it('is the override when it resolves', () => {
    expect(resolveShownImageId([IMG_A, IMG_B], IMG_A.url, 'img-b')).toBe('img-b')
  })

  it('falls back to the primary id when the override is stale', () => {
    expect(resolveShownImageId([IMG_A], IMG_A.url, 'img-deleted')).toBe('img-a')
  })

  it('is null when the shown image is not in the gallery', () => {
    // `entities.image_url` set directly, with no `entity_images` row: marking a
    // thumbnail that is not what the card shows would be a lie.
    expect(resolveShownImageId([IMG_A, IMG_B], '/img/elsewhere.jpg', null)).toBeNull()
  })

  it('is null with no gallery and no primary', () => {
    expect(resolveShownImageId([], null, null)).toBeNull()
    expect(resolveShownImageId(null, null, 'img-b')).toBeNull()
    expect(resolveShownImageId(undefined, IMG_A.url, undefined)).toBeNull()
  })

  it('agrees with resolveShapeImageUrl on every input: the mark IS what is rendered', () => {
    // One rule, two faces. If they ever disagree, the picker marks one image while
    // the card shows another — which is the class of defect this whole file is about.
    const galleries = [[IMG_A, IMG_B], [IMG_A], []]
    const primaries = [IMG_A.url, '/img/elsewhere.jpg', null]
    const overrides = [undefined, null, '', 'img-a', 'img-b', 'img-deleted']
    for (const images of galleries) {
      for (const portraitUrl of primaries) {
        for (const override of overrides) {
          const url = resolveShapeImageUrl({ portraitUrl, images }, override)
          const id = resolveShownImageId(images, portraitUrl, override)
          if (id === null) {
            // Nothing marked -> the rendered url is not one of the gallery's.
            expect(images.some((i) => i.url === url)).toBe(false)
          } else {
            expect(images.find((i) => i.id === id)!.url).toBe(url)
          }
        }
      }
    }
  })
})
