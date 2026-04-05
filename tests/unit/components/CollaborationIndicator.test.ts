import { describe, it, expect } from 'vitest'

// Unit test for the peer rendering logic extracted from CollaborationIndicator
// The component itself depends on HocuspocusProvider awareness, tested via E2E.

function buildPeerList(
  states: Map<number, any>,
  myClientId: number,
): Array<{ clientId: number; name: string; color: string }> {
  const list: Array<{ clientId: number; name: string; color: string }> = []
  states.forEach((state: any, clientId: number) => {
    if (clientId === myClientId) return
    if (state?.user?.name) {
      list.push({ clientId, name: state.user.name, color: state.user.color || '#9ca3af' })
    }
  })
  return list
}

describe('CollaborationIndicator - peer list logic', () => {
  it('returns empty list when only local user is connected', () => {
    const states = new Map([[1, { user: { name: 'Me', color: '#ff0000' } }]])
    expect(buildPeerList(states, 1)).toEqual([])
  })

  it('returns other peers, excluding self', () => {
    const states = new Map([
      [1, { user: { name: 'Me', color: '#ff0000' } }],
      [2, { user: { name: 'Alice', color: '#00ff00' } }],
      [3, { user: { name: 'Bob', color: '#0000ff' } }],
    ])
    const peers = buildPeerList(states, 1)
    expect(peers).toHaveLength(2)
    expect(peers.map((p) => p.name)).toContain('Alice')
    expect(peers.map((p) => p.name)).toContain('Bob')
  })

  it('uses fallback color when peer has no color', () => {
    const states = new Map([[2, { user: { name: 'NoColor' } }]])
    const peers = buildPeerList(states, 1)
    expect(peers[0]?.color).toBe('#9ca3af')
  })

  it('skips entries without user name', () => {
    const states = new Map([
      [2, { user: {} }],
      [3, {}],
    ])
    expect(buildPeerList(states, 1)).toEqual([])
  })
})
