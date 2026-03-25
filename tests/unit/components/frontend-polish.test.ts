import { describe, it, expect } from 'vitest'

/**
 * Frontend polish component logic tests (7.1, 7.2)
 */

// --- 7.1: Auth middleware logic ---

describe('Auth middleware logic (7.1)', () => {
  const publicRoutes = ['/login', '/register']

  function shouldRedirect(path: string, hasSession: boolean): boolean {
    if (publicRoutes.includes(path)) return false
    return !hasSession
  }

  it('redirects when no session on protected route', () => {
    expect(shouldRedirect('/', false)).toBe(true)
    expect(shouldRedirect('/campaigns/123', false)).toBe(true)
  })

  it('passes when valid session', () => {
    expect(shouldRedirect('/', true)).toBe(false)
    expect(shouldRedirect('/campaigns/123', true)).toBe(false)
  })

  it('skips /login and /register', () => {
    expect(shouldRedirect('/login', false)).toBe(false)
    expect(shouldRedirect('/register', false)).toBe(false)
  })
})

// --- 7.2: CampaignSidebar active section logic ---

describe('CampaignSidebar highlights active section (7.2)', () => {
  const sidebarItems = [
    { label: 'Wiki', path: 'entities' },
    { label: 'Characters', path: 'characters' },
    { label: 'Maps', path: 'maps' },
    { label: 'Sessions', path: 'sessions' },
    { label: 'Relations', path: 'relations' },
  ]

  function activeSection(currentPath: string, campaignId: string): string | null {
    const relative = currentPath.replace(`/campaigns/${campaignId}/`, '')
    const item = sidebarItems.find(i => relative.startsWith(i.path))
    return item?.label || null
  }

  it('highlights Wiki when on entities page', () => {
    expect(activeSection('/campaigns/abc/entities', 'abc')).toBe('Wiki')
  })

  it('highlights Characters on character detail', () => {
    expect(activeSection('/campaigns/abc/characters/strahd', 'abc')).toBe('Characters')
  })

  it('highlights Maps on maps page', () => {
    expect(activeSection('/campaigns/abc/maps', 'abc')).toBe('Maps')
  })

  it('returns null on campaign root', () => {
    expect(activeSection('/campaigns/abc/', 'abc')).toBe(null)
  })

  it('highlights Sessions on session detail', () => {
    expect(activeSection('/campaigns/abc/sessions/s1', 'abc')).toBe('Sessions')
  })
})
