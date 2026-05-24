import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEntityRelations } from '../../../app/composables/useEntityRelations'

const CAMPAIGN = 'camp-1'

const mockRelations = [
  {
    id: 'rel-1',
    sourceEntityId: 'char-1',
    targetEntityId: 'char-2',
    relationTypeId: 'ally',
    forwardLabel: 'ally of',
    reverseLabel: 'ally of',
    attitude: 50,
    description: null,
    relatedEntityId: 'char-2',
    relatedEntityName: 'Bob',
    relatedEntitySlug: 'bob',
    relatedEntityType: 'character',
  },
]

const mockOrgDetail = {
  id: 'org-1',
  name: 'Guild',
  members: [
    { characterId: 'char-1', role: 'Knight', characterName: 'Alice', characterSlug: 'alice' },
  ],
}

const mockInhabitants = [{ id: 'char-3', name: 'Carl', slug: 'carl' }]

const mockLocationOrgs = [{ id: 'org-1', name: 'Guild', slug: 'guild' }]

describe('useEntityRelations — character', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('fetches entity relations grouped under "relations" key', async () => {
    vi.stubGlobal(
      '$fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/relations')) return Promise.resolve(mockRelations)
        return Promise.resolve([])
      }),
    )

    const { load, groups } = useEntityRelations(CAMPAIGN, {
      id: 'char-1',
      type: 'character',
      slug: 'alice',
    })
    await load()

    expect(groups.value.entityRelations).toHaveLength(1)
    expect(groups.value.entityRelations[0].id).toBe('rel-1')
    expect(groups.value.members).toHaveLength(0)
    expect(groups.value.inhabitants).toHaveLength(0)
    expect(groups.value.locationOrgs).toHaveLength(0)
  })

  it('exposes isLoading and error state', async () => {
    const err = new Error('Network error')
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(err))

    const { load, isLoading, error } = useEntityRelations(CAMPAIGN, {
      id: 'char-1',
      type: 'character',
      slug: 'alice',
    })
    expect(isLoading.value).toBe(false)

    const p = load()
    await p.catch(() => {})
    expect(error.value).toBeTruthy()
  })
})

describe('useEntityRelations — organization', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('fetches both entity relations and members', async () => {
    vi.stubGlobal(
      '$fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/relations')) return Promise.resolve(mockRelations)
        if (url.includes('/organizations/')) return Promise.resolve(mockOrgDetail)
        return Promise.resolve([])
      }),
    )

    const { load, groups } = useEntityRelations(CAMPAIGN, {
      id: 'org-1',
      type: 'organization',
      slug: 'guild',
    })
    await load()

    expect(groups.value.entityRelations).toHaveLength(1)
    expect(groups.value.members).toHaveLength(1)
    expect(groups.value.members[0].role).toBe('Knight')
  })
})

describe('useEntityRelations — location', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('fetches entity relations, inhabitants and location orgs', async () => {
    vi.stubGlobal(
      '$fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/relations')) return Promise.resolve([])
        if (url.includes('/inhabitants')) return Promise.resolve(mockInhabitants)
        if (url.includes('/organizations')) return Promise.resolve(mockLocationOrgs)
        return Promise.resolve([])
      }),
    )

    const { load, groups } = useEntityRelations(CAMPAIGN, {
      id: 'loc-1',
      type: 'location',
      slug: 'tavern',
    })
    await load()

    expect(groups.value.inhabitants).toHaveLength(1)
    expect(groups.value.locationOrgs).toHaveLength(1)
  })
})

describe('useEntityRelations — refresh', () => {
  it('calls load again when refresh() is invoked', async () => {
    const fetchMock = vi.fn().mockResolvedValue([])
    vi.stubGlobal('$fetch', fetchMock)

    const { load, refresh } = useEntityRelations(CAMPAIGN, {
      id: 'char-1',
      type: 'character',
      slug: 'alice',
    })
    await load()
    const callsAfterLoad = fetchMock.mock.calls.length

    await refresh()
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterLoad)
  })
})
