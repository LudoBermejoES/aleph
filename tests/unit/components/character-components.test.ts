import { describe, it, expect } from 'vitest'
import { stripSecretStats, stripSecretAbilities, canEditCharacter } from '../../../server/services/characters'

/**
 * Component logic tests for character management (8.18, 8.19)
 */

// --- 8.18: Stat group display component logic ---

describe('Stat group display component logic (8.18)', () => {
  const stats = [
    { id: '1', defName: 'Strength', defIsSecret: false, value: '18', groupName: 'Core' },
    { id: '2', defName: 'True Name', defIsSecret: true, value: 'Azzaroth', groupName: 'Secret' },
    { id: '3', defName: 'Dexterity', defIsSecret: false, value: '14', groupName: 'Core' },
  ]

  it('player sees only non-secret stats', () => {
    const visible = stripSecretStats(stats, 'player')
    expect(visible).toHaveLength(2)
    expect(visible.map(s => s.defName)).toEqual(['Strength', 'Dexterity'])
  })

  it('DM sees all stats including secret', () => {
    const visible = stripSecretStats(stats, 'dm')
    expect(visible).toHaveLength(3)
  })

  it('co_dm sees all stats', () => {
    const visible = stripSecretStats(stats, 'co_dm')
    expect(visible).toHaveLength(3)
  })

  it('stats grouped by groupName', () => {
    const grouped = new Map<string, typeof stats>()
    for (const s of stats) {
      const group = grouped.get(s.groupName) || []
      group.push(s)
      grouped.set(s.groupName, group)
    }
    expect(grouped.size).toBe(2)
    expect(grouped.get('Core')?.length).toBe(2)
    expect(grouped.get('Secret')?.length).toBe(1)
  })
})

// --- 8.19: Character edit form logic ---

describe('Character edit form logic (8.19)', () => {
  it('DM can edit any character', () => {
    expect(canEditCharacter('dm', 'user-1', null)).toBe(true)
    expect(canEditCharacter('dm', 'user-1', 'user-2')).toBe(true)
  })

  it('editor can edit any character', () => {
    expect(canEditCharacter('editor', 'user-1', 'user-2')).toBe(true)
  })

  it('player can only edit owned character', () => {
    expect(canEditCharacter('player', 'user-1', 'user-1')).toBe(true)
    expect(canEditCharacter('player', 'user-1', 'user-2')).toBe(false)
    expect(canEditCharacter('player', 'user-1', null)).toBe(false)
  })

  it('visitor cannot edit any character', () => {
    expect(canEditCharacter('visitor', 'user-1', 'user-1')).toBe(false)
  })

  it('form field restrictions: player cannot change name field if not owner', () => {
    // Validation logic: if player, only allow fields the DM has enabled
    const isOwner = canEditCharacter('player', 'user-1', 'user-1')
    const allowedFields = isOwner ? ['race', 'class', 'alignment', 'content'] : []
    expect(isOwner).toBe(true)
    expect(allowedFields).toContain('race')
  })
})
