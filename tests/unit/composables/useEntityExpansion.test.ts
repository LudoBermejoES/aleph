import { describe, it, expect, vi } from 'vitest'
import { useEntityExpansion } from '../../../app/composables/useEntityExpansion'

function makeEditor(shapes: { id: string; type: string; props?: Record<string, unknown> }[]) {
  const created: Record<string, unknown>[] = []
  return {
    getCurrentPageShapes: () => shapes,
    createShape: (shape: Record<string, unknown>) => {
      created.push(shape)
      return shape
    },
    getShape: (id: string) => {
      const s = shapes.find((sh) => sh.id === id)
      return s ? { x: 100, y: 100 } : undefined
    },
    _created: created,
  }
}

const CHAR_A = 'char-a'
const CHAR_B = 'char-b'
const ORG_C = 'org-c'
const LOC_D = 'loc-d'
const CAMPAIGN = 'campaign-1'

const graphData = {
  nodes: {
    [CHAR_A]: { name: 'Alice', type: 'character', slug: 'alice' },
    [CHAR_B]: { name: 'Bob', type: 'character', slug: 'bob' },
    [ORG_C]: { name: 'Guild', type: 'organization', slug: 'guild' },
    [LOC_D]: { name: 'Tavern', type: 'location', slug: 'tavern' },
  },
  edges: {
    'relation:char-a:char-b': { source: CHAR_A, target: CHAR_B },
    'org-member:org-c:char-a': { source: ORG_C, target: CHAR_A },
    'char-location:char-a:loc-d': { source: CHAR_A, target: LOC_D },
  },
}

describe('useEntityExpansion — character', () => {
  it('collects entities connected to character as source', async () => {
    const ed = makeEditor([{ id: 'shape-a', type: 'npcToken', props: { entityId: CHAR_A } }])
    const onComplete = vi.fn()
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(graphData))

    const { expandRelatedEntities } = useEntityExpansion(() => ed as never, CAMPAIGN, onComplete)
    await expandRelatedEntities(CHAR_A, 'character')

    // CHAR_B (target of relation edge from CHAR_A), LOC_D (target of char-location edge)
    // ORG_C is source of org-member edge where CHAR_A is target → CHAR_A excluded (on canvas)
    const placedEntityIds = ed._created.map(
      (s) => (s as { props: { entityId: string } }).props.entityId,
    )
    expect(placedEntityIds).toContain(CHAR_B)
    expect(placedEntityIds).toContain(LOC_D)
    expect(placedEntityIds).toContain(ORG_C)
    expect(onComplete).toHaveBeenCalled()
  })

  it('excludes entities already on canvas', async () => {
    const ed = makeEditor([
      { id: 'shape-a', type: 'npcToken', props: { entityId: CHAR_A } },
      { id: 'shape-b', type: 'npcToken', props: { entityId: CHAR_B } },
    ])
    const onComplete = vi.fn()
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(graphData))

    const { expandRelatedEntities } = useEntityExpansion(() => ed as never, CAMPAIGN, onComplete)
    await expandRelatedEntities(CHAR_A, 'character')

    const placedEntityIds = ed._created.map(
      (s) => (s as { props: { entityId: string } }).props.entityId,
    )
    expect(placedEntityIds).not.toContain(CHAR_B)
    expect(placedEntityIds).toContain(LOC_D)
  })

  it('calls onComplete and places nothing when no related entities off-canvas', async () => {
    const ed = makeEditor([
      { id: 'shape-a', type: 'npcToken', props: { entityId: CHAR_A } },
      { id: 'shape-b', type: 'npcToken', props: { entityId: CHAR_B } },
      { id: 'shape-c', type: 'factionCard', props: { entityId: ORG_C } },
      { id: 'shape-d', type: 'locationPin', props: { entityId: LOC_D } },
    ])
    const onComplete = vi.fn()
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(graphData))

    const { expandRelatedEntities } = useEntityExpansion(() => ed as never, CAMPAIGN, onComplete)
    await expandRelatedEntities(CHAR_A, 'character')

    expect(ed._created).toHaveLength(0)
    expect(onComplete).toHaveBeenCalled()
  })

  it('returns early when no editor', async () => {
    const onComplete = vi.fn()
    const { expandRelatedEntities } = useEntityExpansion(() => null, CAMPAIGN, onComplete)
    await expandRelatedEntities(CHAR_A, 'character')
    expect(onComplete).not.toHaveBeenCalled()
  })
})

describe('useEntityExpansion — organization (regression)', () => {
  it('collects org-member targets', async () => {
    const ed = makeEditor([{ id: 'shape-c', type: 'factionCard', props: { entityId: ORG_C } }])
    const onComplete = vi.fn()
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(graphData))

    const { expandRelatedEntities } = useEntityExpansion(() => ed as never, CAMPAIGN, onComplete)
    await expandRelatedEntities(ORG_C, 'organization')

    const placedEntityIds = ed._created.map(
      (s) => (s as { props: { entityId: string } }).props.entityId,
    )
    expect(placedEntityIds).toContain(CHAR_A)
  })
})

describe('useEntityExpansion — location (regression)', () => {
  it('collects char-location sources', async () => {
    const ed = makeEditor([{ id: 'shape-d', type: 'locationPin', props: { entityId: LOC_D } }])
    const onComplete = vi.fn()
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(graphData))

    const { expandRelatedEntities } = useEntityExpansion(() => ed as never, CAMPAIGN, onComplete)
    await expandRelatedEntities(LOC_D, 'location')

    const placedEntityIds = ed._created.map(
      (s) => (s as { props: { entityId: string } }).props.entityId,
    )
    expect(placedEntityIds).toContain(CHAR_A)
  })
})
