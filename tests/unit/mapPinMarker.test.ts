import { describe, it, expect } from 'vitest'
import {
  escapeHtml,
  buildPinMarkerHtml,
  markerIconSize,
  buildPinPopupHtml,
  ENTITY_TYPE_MARKER_STYLES,
  entityHref,
  pinSizeForZoom,
  MARKER_SIZE_MIN,
  MARKER_SIZE_MAX,
} from '../../app/utils/mapPinMarker'

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    )
    expect(escapeHtml("O'Brien & Sons")).toBe('O&#39;Brien &amp; Sons')
  })

  it('leaves plain text untouched', () => {
    expect(escapeHtml('The Docks')).toBe('The Docks')
  })
})

// design.md D2: three tiers, in order -- entity image, entity-type icon, plain dot.
describe('buildPinMarkerHtml', () => {
  it('tier 1: renders the entity image as a circular, cover-cropped background', () => {
    const html = buildPinMarkerHtml({ entityImageUrl: '/uploads/entities/abc.webp' })
    expect(html).toContain('border-radius:50%')
    expect(html).toContain('background-size:cover')
    expect(html).toContain('/uploads/entities/abc.webp')
    // Not object-fit:contain / background-size:contain -- design.md D2 is explicit that a
    // letterboxed map pin would be worse than a cropped one.
    expect(html).not.toContain('contain')
  })

  it('tier 1 wins over tier 2 when both an image and a type are present', () => {
    const html = buildPinMarkerHtml({ entityImageUrl: '/img.png', entityType: 'character' })
    expect(html).toContain('/img.png')
    expect(html).not.toContain('<svg')
  })

  it('tier 1: carries a background-color fallback keyed by entity type, so a failed image load never renders as a hole', () => {
    const character = buildPinMarkerHtml({ entityImageUrl: '/img.png', entityType: 'character' })
    expect(character).toContain(`background-color:${ENTITY_TYPE_MARKER_STYLES.character.color}`)
    const location = buildPinMarkerHtml({ entityImageUrl: '/img.png', entityType: 'location' })
    expect(location).toContain(`background-color:${ENTITY_TYPE_MARKER_STYLES.location.color}`)
  })

  it('tier 1: falls back to the default glyph colour when there is an image but no entity type', () => {
    const html = buildPinMarkerHtml({ entityImageUrl: '/img.png' })
    expect(html).toContain(`background-color:${ENTITY_TYPE_MARKER_STYLES.default.color}`)
  })

  it('tier 1 escapes the image URL', () => {
    const html = buildPinMarkerHtml({ entityImageUrl: '"><img src=x onerror=alert(1)>' })
    expect(html).not.toContain('"><img')
    expect(html).not.toContain('<img src=x')
  })

  it('tier 2: an entity with no image gets an icon keyed by its type', () => {
    const character = buildPinMarkerHtml({ entityType: 'character' })
    const location = buildPinMarkerHtml({ entityType: 'location' })
    expect(character).toContain('<svg')
    expect(location).toContain('<svg')
    // Two different types must be visually distinguishable (spec: "two entities of different
    // types show different icons") -- different fill colour AND different path.
    expect(character).not.toBe(location)
    expect(character).toContain(ENTITY_TYPE_MARKER_STYLES.character.color)
    expect(location).toContain(ENTITY_TYPE_MARKER_STYLES.location.color)
  })

  it('tier 2: every builtin entity type (server/services/entity-types.ts) has its own glyph', () => {
    const builtinTypes = [
      'character',
      'location',
      'faction',
      'item',
      'event',
      'lore',
      'quest',
      'note',
      'session',
      'arc',
    ]
    const renders = builtinTypes.map((t) => buildPinMarkerHtml({ entityType: t }))
    // All distinct: no two builtin types render the same marker.
    expect(new Set(renders).size).toBe(builtinTypes.length)
  })

  it('tier 2: an unrecognised (custom campaign-defined) type falls back to a legible default glyph', () => {
    const html = buildPinMarkerHtml({ entityType: 'some-custom-type' })
    expect(html).toContain('<svg')
    expect(html).toContain(ENTITY_TYPE_MARKER_STYLES.default.color)
  })

  it('tier 3: no entity at all keeps the plain coloured dot, unchanged', () => {
    const html = buildPinMarkerHtml({ color: '#ff0000' })
    expect(html).toBe(
      '<div style="width:16px;height:16px;border-radius:50%;background:#ff0000;' +
        'border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>',
    )
  })

  it('tier 3: falls back to the original default blue when no color is set', () => {
    const html = buildPinMarkerHtml({})
    expect(html).toContain('#3b82f6')
  })
})

describe('markerIconSize', () => {
  it('is 32px for the image and icon tiers', () => {
    expect(markerIconSize({ entityImageUrl: '/x.png' })).toEqual([32, 32])
    expect(markerIconSize({ entityType: 'character' })).toEqual([32, 32])
  })

  it('is 16px for the plain-dot tier, matching the marker it draws', () => {
    expect(markerIconSize({})).toEqual([16, 16])
  })
})

const LABELS = {
  pinFallback: 'Pin',
  viewEntity: 'View Entity',
  exploreHint: 'Shift+click to explore',
  deletePin: 'Delete pin',
}

describe('buildPinPopupHtml', () => {
  it('escapes an attacker-controlled label instead of injecting it (closes the pre-existing hole)', () => {
    const html = buildPinPopupHtml(
      { id: 'p1', label: '<img src=x onerror=alert(1)>' },
      'camp-1',
      LABELS,
      false,
    )
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('falls back to the given label when the pin has none', () => {
    const html = buildPinPopupHtml({ id: 'p1', label: null }, 'camp-1', LABELS, false)
    expect(html).toContain('>Pin<')
  })

  it("links to the entity's own typed page, escaped, and never by id alone", () => {
    // Reported from production: the link was built from `entityId` against
    // `/campaigns/{id}/entities/{...}` and did not load, because that route is keyed by SLUG.
    // An id with no slug must therefore produce NO link -- a missing link is better than a
    // 404, and it is what the previous behaviour got wrong.
    const character = buildPinPopupHtml(
      {
        id: 'p1',
        label: 'Town',
        entityId: 'e1',
        entityType: 'character',
        entitySlug: 'karoline-ober',
      },
      'camp<1',
      LABELS,
      false,
    )
    expect(character).toContain('View Entity')
    expect(character).toContain('/campaigns/camp&lt;1/characters/karoline-ober')

    const idOnly = buildPinPopupHtml(
      { id: 'p1', label: 'Town', entityId: 'e1' },
      'c1',
      LABELS,
      false,
    )
    expect(idOnly).not.toContain('View Entity')

    const escaped = buildPinPopupHtml(
      { id: 'p1', entityId: 'e1', entityType: 'location', entitySlug: 'a"b' },
      'c1',
      LABELS,
      false,
    )
    expect(escaped).toContain('/locations/a&quot;b')

    const withoutEntity = buildPinPopupHtml({ id: 'p1', label: 'Town' }, 'camp-1', LABELS, false)
    expect(withoutEntity).not.toContain('View Entity')
  })

  it('entityHref maps each type to a route that actually exists', () => {
    // The three the owner named, verbatim from the URLs they gave.
    expect(entityHref('c1', 'character', 'karoline-ober')).toBe(
      '/campaigns/c1/characters/karoline-ober',
    )
    expect(entityHref('c1', 'location', 'bosque-de-tegel')).toBe(
      '/campaigns/c1/locations/bosque-de-tegel',
    )
    expect(entityHref('c1', 'organization', 'sabbat-incursion')).toBe(
      '/campaigns/c1/organizations/sabbat-incursion',
    )
    // An unmapped or custom type falls through to the generic page, which does exist.
    expect(entityHref('c1', 'lore', 'algo')).toBe('/campaigns/c1/entities/algo')
    expect(entityHref('c1', 'un-tipo-inventado', 'algo')).toBe('/campaigns/c1/entities/algo')
    // `item` is deliberately NOT mapped: that route is keyed [itemId], so /items/{slug} 404s.
    expect(entityHref('c1', 'item', 'algo')).toBe('/campaigns/c1/entities/algo')
    // No slug and no campaign are both unaddressable.
    expect(entityHref('c1', 'character', null)).toBeNull()
    expect(entityHref(undefined, 'character', 'x')).toBeNull()
  })

  it('includes the explore hint only when childMapId is set', () => {
    const withChild = buildPinPopupHtml(
      { id: 'p1', label: 'Town', childMapId: 'map-2' },
      'camp-1',
      LABELS,
      false,
    )
    expect(withChild).toContain('Shift+click to explore')

    const withoutChild = buildPinPopupHtml({ id: 'p1', label: 'Town' }, 'camp-1', LABELS, false)
    expect(withoutChild).not.toContain('Shift+click to explore')
  })

  it('includes the delete button, with the pin id, only when canDelete is true', () => {
    const withDelete = buildPinPopupHtml({ id: 'pin-123', label: 'Town' }, 'camp-1', LABELS, true)
    expect(withDelete).toContain('data-pin-delete="pin-123"')
    expect(withDelete).toContain('Delete pin')

    const withoutDelete = buildPinPopupHtml(
      { id: 'pin-123', label: 'Town' },
      'camp-1',
      LABELS,
      false,
    )
    expect(withoutDelete).not.toContain('data-pin-delete')
    expect(withoutDelete).not.toContain('Delete pin')
  })
})

describe('pinSizeForZoom / zoom-scaled markers', () => {
  it("spans exactly 32..96 across the map's own zoom range", () => {
    expect(pinSizeForZoom(0, 0, 19)).toBe(MARKER_SIZE_MIN)
    expect(pinSizeForZoom(19, 0, 19)).toBe(MARKER_SIZE_MAX)
    expect(pinSizeForZoom(9.5, 0, 19)).toBe(64)
  })

  it("uses the range it is given, not OSM's 0..19", () => {
    // An `image` map's maxZoom comes from the uploaded image's dimensions, so assuming 0..19
    // would leave those maps stuck near 32 (or jump straight to 96 on a small range).
    expect(pinSizeForZoom(4, 0, 4)).toBe(MARKER_SIZE_MAX)
    expect(pinSizeForZoom(2, 0, 4)).toBe(64)
  })

  it('clamps outside the range instead of extrapolating', () => {
    expect(pinSizeForZoom(-3, 0, 19)).toBe(MARKER_SIZE_MIN)
    expect(pinSizeForZoom(40, 0, 19)).toBe(MARKER_SIZE_MAX)
  })

  it('never returns NaN for a degenerate range', () => {
    // A zero-width range would divide by zero; a NaN size renders an invisible marker, which
    // is far worse than a small one.
    expect(pinSizeForZoom(5, 10, 10)).toBe(MARKER_SIZE_MIN)
    expect(pinSizeForZoom(5, 20, 10)).toBe(MARKER_SIZE_MIN)
    expect(pinSizeForZoom(NaN, 0, 19)).toBe(MARKER_SIZE_MIN)
  })

  it('markerIconSize agrees with the html for the SAME size argument', () => {
    // If these two disagree Leaflet anchors the marker off-centre, which looks like the pin
    // pointing at the wrong place.
    const withImage = { entityImageUrl: '/img.png', entityType: 'character' }
    expect(markerIconSize(withImage, 96)).toEqual([96, 96])
    expect(buildPinMarkerHtml(withImage, 96)).toContain('width:96px;height:96px')

    // Tier 3 keeps its historic half-size relationship.
    const bare = {}
    expect(markerIconSize(bare, 96)).toEqual([48, 48])
    expect(buildPinMarkerHtml(bare, 96)).toContain('width:48px;height:48px')
  })

  it('scales the border and the glyph with the circle', () => {
    // A 2px border on a 96px pin is a hairline; an 18px glyph inside it is a speck.
    const big = buildPinMarkerHtml({ entityType: 'location' }, 96)
    expect(big).toContain('border:6px solid white')
    expect(big).toContain('width="54"')

    const small = buildPinMarkerHtml({ entityType: 'location' }, 32)
    expect(small).toContain('border:2px solid white')
    expect(small).toContain('width="18"')
  })
})
