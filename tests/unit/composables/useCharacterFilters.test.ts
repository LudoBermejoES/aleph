import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

import { useCharacterFilters } from '../../../app/composables/useCharacterFilters'

const mockQuery = ref<Record<string, string>>({})
const mockReplace = vi.fn()

mockNuxtImport('useRoute', () => () => ({ query: mockQuery.value }))
mockNuxtImport('useRouter', () => () => ({ replace: mockReplace }))

describe('useCharacterFilters', () => {
  beforeEach(() => {
    mockQuery.value = {}
    mockReplace.mockClear()
  })

  it('returns default filter state', () => {
    const f = useCharacterFilters('camp1')
    expect(f.typeFilter.value).toBe('all')
    expect(f.sortField.value).toBe('updatedAt')
    expect(f.sortDir.value).toBe('desc')
    expect(f.showCompanions.value).toBe(true)
  })

  it('initFromUrl restores state from query', () => {
    mockQuery.value = { type: 'npc', sort: 'name', sortDir: 'asc', companions: 'false' }
    const f = useCharacterFilters('camp1')
    f.initFromUrl()
    expect(f.typeFilter.value).toBe('npc')
    expect(f.sortField.value).toBe('name')
    expect(f.sortDir.value).toBe('asc')
    expect(f.showCompanions.value).toBe(false)
  })

  it('setType resets selectedFolder', () => {
    const f = useCharacterFilters('camp1')
    f.selectedFolder.value = 'folder-123'
    const load = vi.fn()
    f.setType('npc', load)
    expect(f.typeFilter.value).toBe('npc')
    expect(f.selectedFolder.value).toBe('')
    expect(load).toHaveBeenCalled()
  })

  it('toggleSortDir flips asc/desc', () => {
    const f = useCharacterFilters('camp1')
    const load = vi.fn()
    expect(f.sortDir.value).toBe('desc')
    f.toggleSortDir(load)
    expect(f.sortDir.value).toBe('asc')
    f.toggleSortDir(load)
    expect(f.sortDir.value).toBe('desc')
  })

  it('buildParams omits default values', () => {
    const f = useCharacterFilters('camp1')
    const params = f.buildParams()
    expect(params.sort).toBe('updatedAt')
    expect(params.sortDir).toBe('desc')
    expect(params.type).toBeUndefined()
    expect(params.search).toBeUndefined()
  })

  it('syncUrl calls router.replace with correct query', () => {
    const f = useCharacterFilters('camp1')
    f.typeFilter.value = 'pc'
    f.searchInput.value = 'Gandalf'
    f.syncUrl()
    expect(mockReplace).toHaveBeenCalledWith({
      query: expect.objectContaining({ type: 'pc', search: 'Gandalf' }),
    })
  })
})
