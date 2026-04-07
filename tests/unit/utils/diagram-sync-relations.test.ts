import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Unit tests for the syncRelations logic extracted from diagramId.vue.
 *
 * The sync function:
 * 1. Collects all entity-linked shapes on canvas (npcToken, entityCard, etc.)
 * 2. Fetches graph data from /api/campaigns/:id/graph
 * 3. For each edge where both source and target entities are on canvas,
 *    creates an arrow shape + two bindings (start/end terminals)
 * 4. Skips edges where the arrow already exists (based on binding pairs)
 */

// Helper: builds a minimal mock editor matching the tldraw v4 API used by syncRelations
function makeMockEditor({
  shapes = [] as { id: string; type: string; props?: Record<string, unknown> }[],
  existingBindings = [] as { arrowId: string; startToId: string; endToId: string }[],
} = {}) {
  const createdShapes: Record<string, unknown>[] = []
  const createdBindings: Record<string, unknown>[] = []
  let shapeCounter = 0

  return {
    getCurrentPageShapes: vi.fn(() => shapes),
    createShape: vi.fn((shape: Record<string, unknown>) => {
      const id = `arrow-${++shapeCounter}`
      createdShapes.push({ ...shape, id })
      return { id }
    }),
    createBinding: vi.fn((binding: Record<string, unknown>) => {
      createdBindings.push(binding)
    }),
    getBindingsFromShape: vi.fn((shapeId: string) => {
      const entry = existingBindings.find((b) => b.arrowId === shapeId)
      if (!entry) return []
      return [
        { toId: entry.startToId, props: { terminal: 'start' } },
        { toId: entry.endToId, props: { terminal: 'end' } },
      ]
    }),
    _createdShapes: createdShapes,
    _createdBindings: createdBindings,
  }
}

// Inline re-implementation of the syncRelations logic (mirrors diagramId.vue)
// This lets us unit-test the algorithm without mounting a Vue component.
async function runSyncRelations(
  ed: ReturnType<typeof makeMockEditor>,
  campaignId: string,
  fetchImpl: typeof globalThis.fetch,
) {
  const ENTITY_TYPES = ['npcToken', 'entityCard', 'locationPin', 'questNode', 'factionCard']
  const entityToShape = new Map<string, string>()
  for (const shape of ed.getCurrentPageShapes()) {
    if (ENTITY_TYPES.includes(shape.type) && shape.props?.entityId) {
      const eid = shape.props.entityId as string
      if (!entityToShape.has(eid)) entityToShape.set(eid, shape.id)
    }
  }
  if (entityToShape.size < 2) return

  let graphData: { edges: Record<string, { source: string; target: string; label?: string }> }
  try {
    const res = await fetchImpl(`/api/campaigns/${campaignId}/graph`)
    graphData = (await (res as Response).json()) as typeof graphData
  } catch {
    return
  }

  const existingArrows = new Set<string>()
  for (const shape of ed.getCurrentPageShapes()) {
    if (shape.type !== 'arrow') continue
    const bindings = ed.getBindingsFromShape(shape.id, 'arrow')
    const startBinding = bindings.find((b) => b.props.terminal === 'start')
    const endBinding = bindings.find((b) => b.props.terminal === 'end')
    if (startBinding && endBinding) {
      existingArrows.add(`${startBinding.toId}→${endBinding.toId}`)
    }
  }

  for (const edge of Object.values(graphData.edges)) {
    const fromShapeId = entityToShape.get(edge.source)
    const toShapeId = entityToShape.get(edge.target)
    if (!fromShapeId || !toShapeId) continue
    if (existingArrows.has(`${fromShapeId}→${toShapeId}`)) continue

    const arrowShape = ed.createShape({
      type: 'arrow',
      props: {
        start: { x: 0, y: 0 },
        end: { x: 100, y: 0 },
        color: 'grey',
        size: 's',
      },
    })
    ed.createBinding({
      type: 'arrow',
      fromId: arrowShape.id,
      toId: fromShapeId,
      props: {
        terminal: 'start',
        normalizedAnchor: { x: 0.5, y: 0.5 },
        isExact: false,
        isPrecise: false,
      },
    })
    ed.createBinding({
      type: 'arrow',
      fromId: arrowShape.id,
      toId: toShapeId,
      props: {
        terminal: 'end',
        normalizedAnchor: { x: 0.5, y: 0.5 },
        isExact: false,
        isPrecise: false,
      },
    })
  }
}

describe('syncRelations', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('creates arrow + two bindings for each matching edge', async () => {
    const shapes = [
      { id: 'shape-1', type: 'npcToken', props: { entityId: 'ent-a', campaignId: 'c1' } },
      { id: 'shape-2', type: 'npcToken', props: { entityId: 'ent-b', campaignId: 'c1' } },
    ]
    const ed = makeMockEditor({ shapes })
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({
        edges: {
          'edge-1': { source: 'ent-a', target: 'ent-b', label: 'ally' },
        },
      }),
    })

    await runSyncRelations(ed, 'c1', mockFetch as unknown as typeof fetch)

    expect(ed.createShape).toHaveBeenCalledTimes(1)
    expect(ed.createBinding).toHaveBeenCalledTimes(2)
    const startBinding = ed._createdBindings.find(
      (b) => (b as { props: { terminal: string } }).props.terminal === 'start',
    )
    const endBinding = ed._createdBindings.find(
      (b) => (b as { props: { terminal: string } }).props.terminal === 'end',
    )
    expect((startBinding as { toId: string }).toId).toBe('shape-1')
    expect((endBinding as { toId: string }).toId).toBe('shape-2')
  })

  it('does not call fetch when fewer than 2 entity shapes are on canvas', async () => {
    const shapes = [
      { id: 'shape-1', type: 'npcToken', props: { entityId: 'ent-a', campaignId: 'c1' } },
    ]
    const ed = makeMockEditor({ shapes })
    const mockFetch = vi.fn()

    await runSyncRelations(ed, 'c1', mockFetch as unknown as typeof fetch)

    expect(mockFetch).not.toHaveBeenCalled()
    expect(ed.createShape).not.toHaveBeenCalled()
  })

  it('skips edges where one entity is not on canvas', async () => {
    const shapes = [
      { id: 'shape-1', type: 'npcToken', props: { entityId: 'ent-a', campaignId: 'c1' } },
      { id: 'shape-2', type: 'npcToken', props: { entityId: 'ent-b', campaignId: 'c1' } },
    ]
    const ed = makeMockEditor({ shapes })
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({
        edges: {
          'edge-1': { source: 'ent-a', target: 'ent-c' }, // ent-c not on canvas
          'edge-2': { source: 'ent-a', target: 'ent-b' }, // both on canvas
        },
      }),
    })

    await runSyncRelations(ed, 'c1', mockFetch as unknown as typeof fetch)

    expect(ed.createShape).toHaveBeenCalledTimes(1) // only ent-a→ent-b
  })

  it('skips duplicate arrows based on existing bindings', async () => {
    const shapes = [
      { id: 'shape-1', type: 'npcToken', props: { entityId: 'ent-a', campaignId: 'c1' } },
      { id: 'shape-2', type: 'npcToken', props: { entityId: 'ent-b', campaignId: 'c1' } },
      { id: 'existing-arrow', type: 'arrow', props: {} },
    ]
    const ed = makeMockEditor({
      shapes,
      existingBindings: [{ arrowId: 'existing-arrow', startToId: 'shape-1', endToId: 'shape-2' }],
    })
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({
        edges: {
          'edge-1': { source: 'ent-a', target: 'ent-b' },
        },
      }),
    })

    await runSyncRelations(ed, 'c1', mockFetch as unknown as typeof fetch)

    expect(ed.createShape).not.toHaveBeenCalled()
  })

  it('handles empty edges gracefully (no arrows created)', async () => {
    const shapes = [
      { id: 'shape-1', type: 'npcToken', props: { entityId: 'ent-a', campaignId: 'c1' } },
      { id: 'shape-2', type: 'npcToken', props: { entityId: 'ent-b', campaignId: 'c1' } },
    ]
    const ed = makeMockEditor({ shapes })
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({ edges: {} }),
    })

    await runSyncRelations(ed, 'c1', mockFetch as unknown as typeof fetch)

    expect(ed.createShape).not.toHaveBeenCalled()
    expect(ed.createBinding).not.toHaveBeenCalled()
  })

  it('ignores non-entity shapes (regionBox, stickyNote, arrow) when building entity map', async () => {
    const shapes = [
      { id: 'shape-1', type: 'npcToken', props: { entityId: 'ent-a', campaignId: 'c1' } },
      { id: 'shape-region', type: 'regionBox', props: { label: 'Act 1' } },
      { id: 'shape-sticky', type: 'stickyNote', props: { text: 'note' } },
      { id: 'shape-2', type: 'entityCard', props: { entityId: 'ent-b', campaignId: 'c1' } },
    ]
    const ed = makeMockEditor({ shapes })
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({
        edges: { 'edge-1': { source: 'ent-a', target: 'ent-b' } },
      }),
    })

    await runSyncRelations(ed, 'c1', mockFetch as unknown as typeof fetch)

    expect(ed.createShape).toHaveBeenCalledTimes(1)
  })

  it('does not crash when fetch fails', async () => {
    const shapes = [
      { id: 'shape-1', type: 'npcToken', props: { entityId: 'ent-a', campaignId: 'c1' } },
      { id: 'shape-2', type: 'npcToken', props: { entityId: 'ent-b', campaignId: 'c1' } },
    ]
    const ed = makeMockEditor({ shapes })
    const mockFetch = vi.fn().mockRejectedValue(new Error('network error'))

    await expect(
      runSyncRelations(ed, 'c1', mockFetch as unknown as typeof fetch),
    ).resolves.not.toThrow()
    expect(ed.createShape).not.toHaveBeenCalled()
  })
})
