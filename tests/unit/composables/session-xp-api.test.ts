import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSessionApi } from '../../../app/composables/useSessionApi'

/**
 * The last link of the chain the panel starts: what the component emits must arrive, unchanged,
 * in the body of ONE `PUT`. Asserted against the request the composable actually issues, because
 * "the input is accepted" proves nothing about what was sent.
 */

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ success: true, xpAwards: [] })
  ;(globalThis as Record<string, unknown>).$fetch = fetchMock
})

afterEach(() => {
  delete (globalThis as Record<string, unknown>).$fetch
})

describe('setSessionXpAwards', () => {
  it('PUTs the whole award list to the session xp route, once', async () => {
    const awards = [
      { characterId: 'otto', xp: 2 },
      { characterId: 'julia', xp: 3 },
    ]
    await useSessionApi('camp-1').setSessionXpAwards('sesion-4', awards)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/campaigns/camp-1/sessions/sesion-4/xp')
    expect(options.method).toBe('PUT')
    // Deep-equal, not "contains": a body that quietly renamed or dropped a key would still pass a
    // shape check, and the server's zod would strip the wrong name without complaining.
    expect(options.body).toEqual({ awards })
  })

  it('sends an empty list as an empty list, which clears the session', async () => {
    await useSessionApi('camp-1').setSessionXpAwards('sesion-4', [])
    expect(fetchMock.mock.calls[0]![1].body).toEqual({ awards: [] })
  })

  it('no longer offers the removed per-user attendance XP route', () => {
    expect('setSessionAttendanceXp' in useSessionApi('camp-1')).toBe(false)
  })
})
