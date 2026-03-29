import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Unit tests for character list filter logic (8.11, 8.12)
 */

// ─── 8.11: URL param initialization ──────────────────────────────────────────

function initFiltersFromQuery(query: Record<string, string | string[]>) {
  const str = (key: string, def = '') => (query[key] as string) || def
  return {
    typeFilter: str('type', 'all'),
    selectedFolder: str('folderId'),
    searchInput: str('search'),
    statusFilter: str('status'),
    raceFilter: str('race'),
    classFilter: str('class'),
    alignmentFilter: str('alignment'),
    orgFilter: str('org'),
    locationFilter: str('location'),
    showCompanions: query.companions !== 'false',
    sortField: str('sort', 'updatedAt'),
    sortDir: str('sortDir', 'desc'),
  }
}

describe('initFiltersFromQuery (8.11)', () => {
  it('defaults when query is empty', () => {
    const state = initFiltersFromQuery({})
    expect(state.typeFilter).toBe('all')
    expect(state.sortField).toBe('updatedAt')
    expect(state.sortDir).toBe('desc')
    expect(state.showCompanions).toBe(true)
    expect(state.searchInput).toBe('')
    expect(state.statusFilter).toBe('')
    expect(state.raceFilter).toBe('')
  })

  it('picks up type from query', () => {
    const state = initFiltersFromQuery({ type: 'pc' })
    expect(state.typeFilter).toBe('pc')
  })

  it('picks up all filter params from query', () => {
    const state = initFiltersFromQuery({
      type: 'npc',
      folderId: 'folder-1',
      search: 'Gan',
      status: 'alive',
      race: 'Elf',
      class: 'Wizard',
      alignment: 'Neutral Good',
      org: 'org-123',
      location: 'loc-456',
      sort: 'name',
      sortDir: 'asc',
    })
    expect(state.typeFilter).toBe('npc')
    expect(state.selectedFolder).toBe('folder-1')
    expect(state.searchInput).toBe('Gan')
    expect(state.statusFilter).toBe('alive')
    expect(state.raceFilter).toBe('Elf')
    expect(state.classFilter).toBe('Wizard')
    expect(state.alignmentFilter).toBe('Neutral Good')
    expect(state.orgFilter).toBe('org-123')
    expect(state.locationFilter).toBe('loc-456')
    expect(state.sortField).toBe('name')
    expect(state.sortDir).toBe('asc')
  })

  it('companions=false sets showCompanions to false', () => {
    const state = initFiltersFromQuery({ companions: 'false' })
    expect(state.showCompanions).toBe(false)
  })

  it('companions=true keeps showCompanions true', () => {
    const state = initFiltersFromQuery({ companions: 'true' })
    expect(state.showCompanions).toBe(true)
  })
})

// ─── 8.12: Debounce logic ─────────────────────────────────────────────────────

describe('Debounced search (8.12)', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('only fires once after 300ms of silence', () => {
    const fetchFn = vi.fn()
    let timer: ReturnType<typeof setTimeout>

    function onInput() {
      clearTimeout(timer)
      timer = setTimeout(() => fetchFn(), 300)
    }

    // Simulate rapid typing
    onInput()
    onInput()
    onInput()

    // Should not have fired yet
    expect(fetchFn).not.toHaveBeenCalled()

    // Advance past debounce window
    vi.advanceTimersByTime(300)

    // Should fire exactly once
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('does not fire during the 300ms window', () => {
    const fetchFn = vi.fn()
    let timer: ReturnType<typeof setTimeout>

    function onInput() {
      clearTimeout(timer)
      timer = setTimeout(() => fetchFn(), 300)
    }

    onInput()
    vi.advanceTimersByTime(200)
    expect(fetchFn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('resets the timer on each new input', () => {
    const fetchFn = vi.fn()
    let timer: ReturnType<typeof setTimeout>

    function onInput() {
      clearTimeout(timer)
      timer = setTimeout(() => fetchFn(), 300)
    }

    onInput()
    vi.advanceTimersByTime(250)
    onInput() // reset timer
    vi.advanceTimersByTime(250) // still within debounce of second input
    expect(fetchFn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(50) // now past 300ms from second input
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})
