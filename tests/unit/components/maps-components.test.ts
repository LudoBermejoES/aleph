import { describe, it, expect } from 'vitest'

/**
 * Maps component logic tests (9.20, 9.21)
 */

// --- 9.20: Breadcrumb navigation ---

interface MapBreadcrumb {
  label: string
  href: string
}

function buildMapBreadcrumbs(campaignId: string, mapName: string): MapBreadcrumb[] {
  return [
    { label: 'Campaign', href: `/campaigns/${campaignId}` },
    { label: 'Maps', href: `/campaigns/${campaignId}/maps` },
    { label: mapName, href: '#' },
  ]
}

describe('Map breadcrumb navigation (9.20)', () => {
  it('renders Campaign > Maps > map name', () => {
    const crumbs = buildMapBreadcrumbs('camp-1', 'Barovia Regional Map')
    expect(crumbs).toHaveLength(3)
    expect(crumbs[0].label).toBe('Campaign')
    expect(crumbs[1].label).toBe('Maps')
    expect(crumbs[1].href).toBe('/campaigns/camp-1/maps')
    expect(crumbs[2].label).toBe('Barovia Regional Map')
  })
})

// --- 9.21: Layer toggle panel ---

interface MapLayer {
  id: string
  name: string
  visible: boolean
}

function toggleLayer(layers: MapLayer[], layerId: string): MapLayer[] {
  return layers.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l)
}

function visibleLayers(layers: MapLayer[]): MapLayer[] {
  return layers.filter(l => l.visible)
}

describe('Layer toggle panel (9.21)', () => {
  const layers: MapLayer[] = [
    { id: 'pins', name: 'Pins', visible: true },
    { id: 'fog', name: 'Fog of War', visible: false },
    { id: 'grid', name: 'Grid', visible: true },
  ]

  it('toggle flips visibility', () => {
    const updated = toggleLayer(layers, 'fog')
    expect(updated.find(l => l.id === 'fog')?.visible).toBe(true)
  })

  it('toggle off a visible layer', () => {
    const updated = toggleLayer(layers, 'pins')
    expect(updated.find(l => l.id === 'pins')?.visible).toBe(false)
  })

  it('visibleLayers returns only visible', () => {
    expect(visibleLayers(layers)).toHaveLength(2)
    expect(visibleLayers(layers).map(l => l.id)).toEqual(['pins', 'grid'])
  })

  it('toggling unknown layer is a no-op', () => {
    const updated = toggleLayer(layers, 'nonexistent')
    expect(updated).toEqual(layers)
  })
})
