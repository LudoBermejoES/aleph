import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hydrateEntityShapes } from '../../../app/utils/diagram-hydration'

describe('hydrateEntityShapes', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls updateShapes with merged results from batch fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        'entity-1': {
          id: 'entity-1',
          name: 'Updated Name',
          type: 'character',
          slug: 'updated-name',
          portraitUrl: '/img/new.jpg',
          status: 'alive',
          tags: [],
        },
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const updateShapes = vi.fn()
    const editor = {
      getCurrentPageShapes: () => [
        {
          id: 'shape-1',
          type: 'npcToken',
          props: {
            entityId: 'entity-1',
            campaignId: 'camp-1',
            characterName: 'Old Name',
            slug: 'old-name',
          },
        },
      ],
      updateShapes,
    }

    await hydrateEntityShapes(editor, 'camp-1')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/campaigns/camp-1/diagrams/entities/batch?ids=entity-1'),
    )
    expect(updateShapes).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'shape-1' })]),
    )
  })

  it('refreshes locationPin shapes with the location image', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        'loc-1': {
          id: 'loc-1',
          name: 'Updated Tavern',
          type: 'location',
          slug: 'updated-tavern',
          portraitUrl: '/img/tavern.png',
          status: null,
          tags: [],
        },
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const updateShapes = vi.fn()
    const editor = {
      getCurrentPageShapes: () => [
        {
          id: 'shape-loc',
          type: 'locationPin',
          props: { entityId: 'loc-1', campaignId: 'camp-1', locationName: 'Old Tavern' },
        },
      ],
      updateShapes,
    }

    await hydrateEntityShapes(editor, 'camp-1')

    expect(updateShapes).toHaveBeenCalledWith([
      {
        id: 'shape-loc',
        props: { locationName: 'Updated Tavern', locationImageUrl: '/img/tavern.png' },
      },
    ])
  })

  it('batches 120 entity IDs into 3 requests of 50', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    vi.stubGlobal('fetch', mockFetch)

    const shapes = Array.from({ length: 120 }, (_, i) => ({
      id: `shape-${i}`,
      type: 'npcToken',
      props: {
        entityId: `entity-${i}`,
        campaignId: 'camp-1',
        characterName: `Name ${i}`,
        slug: `name-${i}`,
      },
    }))

    const editor = {
      getCurrentPageShapes: () => shapes,
      updateShapes: vi.fn(),
    }

    await hydrateEntityShapes(editor, 'camp-1')

    expect(mockFetch).toHaveBeenCalledTimes(3)
    const firstCallUrl = mockFetch.mock.calls[0][0] as string
    const firstIds = new URLSearchParams(firstCallUrl.split('?')[1]).get('ids')?.split(',')
    expect(firstIds).toHaveLength(50)
  })

  it('skips shapes without entityId', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    vi.stubGlobal('fetch', mockFetch)

    const updateShapes = vi.fn()
    const editor = {
      getCurrentPageShapes: () => [
        { id: 'shape-reg', type: 'regionBox', props: { label: 'Act 1' } },
        { id: 'shape-sticky', type: 'stickyNote', props: { text: 'note' } },
      ],
      updateShapes,
    }

    await hydrateEntityShapes(editor, 'camp-1')

    expect(mockFetch).not.toHaveBeenCalled()
    expect(updateShapes).not.toHaveBeenCalled()
  })

  it('does not crash when fetch returns empty object', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }),
    )

    const updateShapes = vi.fn()
    const editor = {
      getCurrentPageShapes: () => [
        {
          id: 'shape-1',
          type: 'npcToken',
          props: {
            entityId: 'entity-deleted',
            campaignId: 'camp-1',
            characterName: 'Ghost',
            slug: 'ghost',
          },
        },
      ],
      updateShapes,
    }

    await expect(hydrateEntityShapes(editor, 'camp-1')).resolves.not.toThrow()
    expect(updateShapes).not.toHaveBeenCalled()
  })
})
