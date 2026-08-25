import { describe, it, expect } from 'vitest'
import {
  escapeHtml,
  buildPinMarkerHtml,
  markerIconSize,
  buildPinPopupHtml,
  ENTITY_TYPE_MARKER_STYLES,
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

  it('includes an escaped entity link only when entityId is set', () => {
    const withEntity = buildPinPopupHtml(
      { id: 'p1', label: 'Town', entityId: 'e"1' },
      'camp<1',
      LABELS,
      false,
    )
    expect(withEntity).toContain('View Entity')
    expect(withEntity).toContain('/entities/e&quot;1')
    expect(withEntity).toContain('/campaigns/camp&lt;1/')

    const withoutEntity = buildPinPopupHtml({ id: 'p1', label: 'Town' }, 'camp-1', LABELS, false)
    expect(withoutEntity).not.toContain('View Entity')
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
