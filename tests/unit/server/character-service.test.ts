import { describe, it, expect } from 'vitest'
import {
  stripSecretStats,
  stripSecretAbilities,
  canEditCharacter,
  buildCharacterFrontmatter,
  buildDuplicateName,
} from '../../../server/services/characters'

describe('stripSecretStats', () => {
  const stats = [
    { id: '1', value: '144', defName: 'HP', defKey: 'hp', defIsSecret: false, groupName: 'Combat' },
    { id: '2', value: 'Sunlight', defName: 'Weakness', defKey: 'weakness', defIsSecret: true, groupName: 'Combat' },
    { id: '3', value: '16', defName: 'AC', defKey: 'ac', defIsSecret: false, groupName: 'Combat' },
  ]

  it('removes secret stats for player role', () => {
    const result = stripSecretStats(stats, 'player')
    expect(result).toHaveLength(2)
    expect(result.every(s => !s.defIsSecret)).toBe(true)
  })

  it('keeps all stats for DM role', () => {
    const result = stripSecretStats(stats, 'dm')
    expect(result).toHaveLength(3)
  })

  it('keeps all stats for co_dm role', () => {
    const result = stripSecretStats(stats, 'co_dm')
    expect(result).toHaveLength(3)
  })

  it('removes secret stats for editor role', () => {
    const result = stripSecretStats(stats, 'editor')
    expect(result).toHaveLength(2)
  })

  it('returns empty array for empty input', () => {
    expect(stripSecretStats([], 'player')).toEqual([])
  })
})

describe('stripSecretAbilities', () => {
  const abilities = [
    { id: '1', name: 'Charm', type: 'action', isSecret: false },
    { id: '2', name: 'Dark Gift', type: 'trait', isSecret: true },
  ]

  it('removes secret abilities for player', () => {
    const result = stripSecretAbilities(abilities, 'player')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Charm')
  })

  it('keeps all abilities for DM', () => {
    const result = stripSecretAbilities(abilities, 'dm')
    expect(result).toHaveLength(2)
  })
})

describe('canEditCharacter', () => {
  it('DM can edit any character', () => {
    expect(canEditCharacter('dm', 'user-1', 'user-2')).toBe(true)
  })

  it('co_dm can edit any character', () => {
    expect(canEditCharacter('co_dm', 'user-1', 'user-2')).toBe(true)
  })

  it('editor can edit any character', () => {
    expect(canEditCharacter('editor', 'user-1', 'user-2')).toBe(true)
  })

  it('player can edit own character', () => {
    expect(canEditCharacter('player', 'user-1', 'user-1')).toBe(true)
  })

  it('player cannot edit another players character', () => {
    expect(canEditCharacter('player', 'user-1', 'user-2')).toBe(false)
  })

  it('player cannot edit unowned NPC', () => {
    expect(canEditCharacter('player', 'user-1', null)).toBe(false)
  })

  it('visitor cannot edit any character', () => {
    expect(canEditCharacter('visitor', 'user-1', 'user-1')).toBe(false)
  })
})

describe('buildCharacterFrontmatter', () => {
  it('builds frontmatter with required fields', () => {
    const fm = buildCharacterFrontmatter({
      id: 'ent-1',
      name: 'Strahd',
      characterType: 'npc',
    })
    expect(fm.id).toBe('ent-1')
    expect(fm.type).toBe('character')
    expect(fm.name).toBe('Strahd')
    expect(fm.fields.characterType).toBe('npc')
  })

  it('excludes undefined optional fields', () => {
    const fm = buildCharacterFrontmatter({
      id: 'ent-1',
      name: 'Strahd',
      characterType: 'npc',
      race: undefined,
      charClass: undefined,
    })
    expect(fm.fields).not.toHaveProperty('race')
    expect(fm.fields).not.toHaveProperty('class')
  })

  it('includes provided optional fields', () => {
    const fm = buildCharacterFrontmatter({
      id: 'ent-1',
      name: 'Gandalf',
      characterType: 'npc',
      race: 'Maiar',
      charClass: 'Wizard',
      alignment: 'Neutral Good',
    })
    expect(fm.fields.race).toBe('Maiar')
    expect(fm.fields.class).toBe('Wizard')
    expect(fm.fields.alignment).toBe('Neutral Good')
  })

  it('defaults visibility to members', () => {
    const fm = buildCharacterFrontmatter({ id: 'x', name: 'X', characterType: 'npc' })
    expect(fm.visibility).toBe('members')
  })
})

describe('buildDuplicateName', () => {
  it('appends (Copy) to name', () => {
    expect(buildDuplicateName('Strahd von Zarovich')).toBe('Strahd von Zarovich (Copy)')
  })

  it('handles names already ending with (Copy)', () => {
    expect(buildDuplicateName('Strahd (Copy)')).toBe('Strahd (Copy) (Copy)')
  })
})
