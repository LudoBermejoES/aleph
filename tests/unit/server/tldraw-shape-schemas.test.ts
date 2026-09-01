import { describe, it, expect } from 'vitest'
import { alephTLSchema } from '../../../server/services/tldraw-shape-schemas'

const shapeValidator = alephTLSchema.types.shape.validator

function makeShape(type: string, props: Record<string, unknown>) {
  return {
    id: `shape:${type}-test`,
    typeName: 'shape',
    type,
    x: 0,
    y: 0,
    rotation: 0,
    isLocked: false,
    opacity: 1,
    index: 'a1',
    parentId: 'page:page1',
    meta: {},
    props,
  }
}

describe('alephTLSchema', () => {
  it('exports a valid TLSchema with shape type', () => {
    expect(alephTLSchema.types.shape).toBeDefined()
    expect(shapeValidator).toBeDefined()
    expect(typeof shapeValidator.validate).toBe('function')
  })

  it('preserves all default shape types in the schema', () => {
    // 'geo' should fail on missing required props, NOT be rejected as an unknown type
    let errorMsg = ''
    try {
      shapeValidator.validate(makeShape('geo', { w: 100, h: 100 }))
    } catch (e: unknown) {
      errorMsg = (e as Error).message
    }
    expect(errorMsg).not.toMatch(/Expected one of/)
    expect(errorMsg.length).toBeGreaterThan(0)
  })

  it('rejects unknown shape types', () => {
    expect(() => shapeValidator.validate(makeShape('unknownShape', { w: 100 }))).toThrow()
  })

  describe('npcToken', () => {
    const baseProps = {
      w: 100,
      h: 100,
      entityId: 'entity-1',
      campaignId: 'campaign-1',
      characterName: 'Gandalf',
      slug: 'gandalf',
    }

    it('validates with required props only', () => {
      expect(() => shapeValidator.validate(makeShape('npcToken', baseProps))).not.toThrow()
    })

    it('validates with all optional props', () => {
      expect(() =>
        shapeValidator.validate(
          makeShape('npcToken', {
            ...baseProps,
            portraitUrl: 'https://example.com/portrait.jpg',
            statusBadge: 'injured',
            tags: ['ally', 'wizard'],
          }),
        ),
      ).not.toThrow()
    })

    it('rejects when required prop is missing', () => {
      const { characterName: _, ...withoutName } = baseProps
      expect(() => shapeValidator.validate(makeShape('npcToken', withoutName))).toThrow()
    })
  })

  describe('locationPin', () => {
    const baseProps = {
      w: 80,
      h: 80,
      entityId: 'loc-1',
      campaignId: 'campaign-1',
      locationName: 'The Shire',
      slug: 'the-shire',
    }

    it('validates with required props', () => {
      expect(() => shapeValidator.validate(makeShape('locationPin', baseProps))).not.toThrow()
    })

    it('rejects when slug is missing', () => {
      const { slug: _, ...withoutSlug } = baseProps
      expect(() => shapeValidator.validate(makeShape('locationPin', withoutSlug))).toThrow()
    })

    it('validates with an optional locationImageUrl', () => {
      expect(() =>
        shapeValidator.validate(
          makeShape('locationPin', { ...baseProps, locationImageUrl: '/img/shire.png' }),
        ),
      ).not.toThrow()
    })
  })

  describe('questNode', () => {
    it('validates with required props', () => {
      expect(() =>
        shapeValidator.validate(
          makeShape('questNode', {
            w: 120,
            h: 80,
            entityId: 'quest-1',
            campaignId: 'campaign-1',
            questTitle: 'Destroy the Ring',
            status: 'active',
            slug: 'destroy-the-ring',
          }),
        ),
      ).not.toThrow()
    })
  })

  describe('factionCard', () => {
    const baseProps = {
      w: 150,
      h: 100,
      entityId: 'faction-1',
      campaignId: 'campaign-1',
      factionName: 'Fellowship',
      slug: 'fellowship',
    }

    it('validates with required props only', () => {
      expect(() => shapeValidator.validate(makeShape('factionCard', baseProps))).not.toThrow()
    })

    it('validates with all optional props', () => {
      expect(() =>
        shapeValidator.validate(
          makeShape('factionCard', {
            ...baseProps,
            crestUrl: 'https://example.com/crest.png',
            alignment: 'good',
            memberCount: 9,
          }),
        ),
      ).not.toThrow()
    })
  })

  describe('entityCard', () => {
    it('validates with required props', () => {
      expect(() =>
        shapeValidator.validate(
          makeShape('entityCard', {
            w: 120,
            h: 80,
            entityId: 'ent-1',
            campaignId: 'campaign-1',
            entityName: 'Palantir',
            entityType: 'item',
            slug: 'palantir',
          }),
        ),
      ).not.toThrow()
    })

    it('validates with optional portraitUrl', () => {
      expect(() =>
        shapeValidator.validate(
          makeShape('entityCard', {
            w: 120,
            h: 80,
            entityId: 'ent-2',
            campaignId: 'campaign-1',
            entityName: 'Aragorn',
            entityType: 'npc',
            portraitUrl: 'https://example.com/aragorn.jpg',
            slug: 'aragorn',
          }),
        ),
      ).not.toThrow()
    })
  })

  describe('regionBox', () => {
    it('validates with required props only', () => {
      expect(() =>
        shapeValidator.validate(makeShape('regionBox', { w: 300, h: 200, label: 'Mordor' })),
      ).not.toThrow()
    })

    it('validates with optional color', () => {
      expect(() =>
        shapeValidator.validate(
          makeShape('regionBox', { w: 300, h: 200, label: 'Gondor', color: '#ff0000' }),
        ),
      ).not.toThrow()
    })
  })

  describe('anchorToken', () => {
    it('validates with required props only', () => {
      expect(() =>
        shapeValidator.validate(
          makeShape('anchorToken', {
            w: 60,
            h: 60,
            label: 'World Map',
            targetType: 'diagram',
          }),
        ),
      ).not.toThrow()
    })

    it('validates with all optional props', () => {
      expect(() =>
        shapeValidator.validate(
          makeShape('anchorToken', {
            w: 60,
            h: 60,
            label: 'External',
            targetType: 'url',
            targetDiagramId: 'diag-123',
            targetUrl: 'https://example.com',
            color: '#0000ff',
          }),
        ),
      ).not.toThrow()
    })
  })

  describe('mapToken', () => {
    it('validates with required props', () => {
      expect(() =>
        shapeValidator.validate(
          makeShape('mapToken', {
            w: 200,
            h: 150,
            mapId: 'map-1',
            campaignId: 'campaign-1',
            label: 'World Map',
          }),
        ),
      ).not.toThrow()
    })

    it('validates with optional imageUrl', () => {
      expect(() =>
        shapeValidator.validate(
          makeShape('mapToken', {
            w: 200,
            h: 150,
            mapId: 'map-2',
            campaignId: 'campaign-1',
            label: 'Dungeon',
            imageUrl: 'https://example.com/map.jpg',
          }),
        ),
      ).not.toThrow()
    })
  })

  describe('stickyNote', () => {
    it('validates with required props only', () => {
      expect(() =>
        shapeValidator.validate(makeShape('stickyNote', { w: 200, h: 200, text: 'Remember this' })),
      ).not.toThrow()
    })

    it('validates with optional color', () => {
      expect(() =>
        shapeValidator.validate(
          makeShape('stickyNote', { w: 200, h: 200, text: 'Important', color: 'yellow' }),
        ),
      ).not.toThrow()
    })
  })

  describe('canvasLabel', () => {
    it('validates with required props only', () => {
      expect(() =>
        shapeValidator.validate(makeShape('canvasLabel', { w: 300, h: 50, text: 'Chapter 1' })),
      ).not.toThrow()
    })

    it('validates with optional fontSize and color', () => {
      expect(() =>
        shapeValidator.validate(
          makeShape('canvasLabel', {
            w: 300,
            h: 50,
            text: 'Chapter 1',
            fontSize: 24,
            color: '#333333',
          }),
        ),
      ).not.toThrow()
    })
  })

  describe('genealogyNode', () => {
    const baseProps = {
      w: 120,
      h: 80,
      entityId: 'char-1',
      campaignId: 'campaign-1',
      characterName: 'Elrond',
      slug: 'elrond',
    }

    it('validates with required props only', () => {
      expect(() => shapeValidator.validate(makeShape('genealogyNode', baseProps))).not.toThrow()
    })

    it('validates with all optional props', () => {
      expect(() =>
        shapeValidator.validate(
          makeShape('genealogyNode', {
            ...baseProps,
            portraitUrl: 'https://example.com/elrond.jpg',
            birthYear: 521,
            deathYear: undefined,
            gender: 'male',
          }),
        ),
      ).not.toThrow()
    })
  })

  /**
   * Regression for `fix-diagram-image-override-autosave-race` (D4, corrected): production runs
   * with `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER=true` (confirmed on the live server's `.env`, not
   * assumed from this repo's local default of `false`), so every `updateShapes` call goes over
   * the `@tldraw/sync` socket into `TLSocketRoom`, which validates against exactly this schema —
   * `alephTLSchema`, the real production object, not a re-implementation of its rules. Before this
   * fix, picking a non-primary card image threw `TLSyncError: At shape(type = locationPin).props
   * .imageOverrideId: Unexpected property` — `diffAndValidateRecord`'s default
   * `shouldAllowUnknownProperties = false` — which `TLSyncRoom.handleMessage` turns into
   * `rejectSession`, closing that client's socket. 20 occurrences of exactly this, all
   * `locationPin`, were read from `/var/www/aleph/logs/pm2-error.log` on the live server between
   * 07:01 and 08:49 on 2026-09-01 — both before AND after the autosave-race fix deployed at 08:08,
   * proving this is a second, independent gap the first fix's own investigation found and
   * (incorrectly, per its D4) judged out of scope because it believed sync mode was off in
   * production. It is the four shapes that actually carry the prop client-side
   * (`app/components/diagrams/react/shapes/{EntityCard,FactionCard,LocationPin,NPCToken}Shape.tsx`)
   * — enumerated from that code, not from memory, alongside `genealogyNode` and `questNode` as
   * negative controls that do NOT carry it and must keep rejecting it.
   */
  describe('imageOverrideId (per-shape card image override)', () => {
    it.each(['npcToken', 'locationPin', 'factionCard', 'entityCard'])(
      'accepts imageOverrideId on %s',
      (type) => {
        const props = { w: 100, h: 100, ...minimalPropsFor(type), imageOverrideId: 'img-123' }
        expect(() => shapeValidator.validate(makeShape(type, props))).not.toThrow()
      },
    )

    it.each(['npcToken', 'locationPin', 'factionCard', 'entityCard'])(
      'accepts %s with imageOverrideId entirely absent (a snapshot saved before this feature existed)',
      (type) => {
        const props = { w: 100, h: 100, ...minimalPropsFor(type) }
        expect(() => shapeValidator.validate(makeShape(type, props))).not.toThrow()
      },
    )

    it.each(['questNode', 'genealogyNode'])(
      'still rejects imageOverrideId on %s (negative control: this shape never carries it)',
      (type) => {
        const props = { w: 100, h: 100, ...minimalPropsFor(type), imageOverrideId: 'img-123' }
        expect(() => shapeValidator.validate(makeShape(type, props))).toThrow(/Unexpected property/)
      },
    )
  })

  /**
   * `aspectRatio` landed on the same four shapes in the same client-side files, from a different,
   * concurrent change. Checked here because the mechanism that produced the `imageOverrideId` gap
   * (a prop added to the client shape's `RecordProps` but not to this server-side duplicate) is
   * generic, not specific to one prop — and this one was already declared correctly on all four,
   * verified by these tests rather than assumed.
   */
  describe('aspectRatio (per-shape image fit, from a separate change)', () => {
    it.each(['npcToken', 'locationPin', 'factionCard', 'entityCard'])(
      'accepts aspectRatio on %s',
      (type) => {
        const props = { w: 100, h: 100, ...minimalPropsFor(type), aspectRatio: 1.5 }
        expect(() => shapeValidator.validate(makeShape(type, props))).not.toThrow()
      },
    )
  })

  it('registers all 11 custom shape types', () => {
    const customTypes = [
      'npcToken',
      'locationPin',
      'questNode',
      'factionCard',
      'entityCard',
      'regionBox',
      'anchorToken',
      'mapToken',
      'stickyNote',
      'canvasLabel',
      'genealogyNode',
    ]
    for (const type of customTypes) {
      expect(() =>
        shapeValidator.validate(makeShape(type, { w: 100, h: 100, ...minimalPropsFor(type) })),
      ).not.toThrow()
    }
  })
})

function minimalPropsFor(type: string): Record<string, unknown> {
  const campaignBase = { entityId: 'e1', campaignId: 'c1', slug: 's1' }
  switch (type) {
    case 'npcToken':
      return { ...campaignBase, characterName: 'X' }
    case 'locationPin':
      return { ...campaignBase, locationName: 'X' }
    case 'questNode':
      return { ...campaignBase, questTitle: 'X', status: 'active' }
    case 'factionCard':
      return { ...campaignBase, factionName: 'X' }
    case 'entityCard':
      return { ...campaignBase, entityName: 'X', entityType: 'npc' }
    case 'regionBox':
      return { label: 'X' }
    case 'anchorToken':
      return { label: 'X', targetType: 'diagram' }
    case 'mapToken':
      return { mapId: 'm1', campaignId: 'c1', label: 'X' }
    case 'stickyNote':
      return { text: 'X' }
    case 'canvasLabel':
      return { text: 'X' }
    case 'genealogyNode':
      return { ...campaignBase, characterName: 'X' }
    default:
      return {}
  }
}
