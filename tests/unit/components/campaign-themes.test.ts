import { describe, it, expect } from 'vitest'
import { CAMPAIGN_THEMES } from '../../../app/utils/themes'

describe('CAMPAIGN_THEMES constants', () => {
  it('includes the default theme', () => {
    const def = CAMPAIGN_THEMES.find((t) => t.id === 'default')
    expect(def).toBeDefined()
    expect(def?.name).toBe('Default')
  })

  // Deliberately a hardcoded count, kept as a tripwire: it forces a human to
  // acknowledge each catalogue change. CSS parity is checked registry-derived in
  // tests/unit/css/themes.test.ts, so this number's job is only "was this
  // addition intentional?" — bump it, don't delete it.
  it('includes all 12 themes', () => {
    expect(CAMPAIGN_THEMES).toHaveLength(12)
  })

  it('includes the superhero theme', () => {
    const superhero = CAMPAIGN_THEMES.find((t) => t.id === 'superhero')
    expect(superhero).toBeDefined()
    expect(superhero?.name).toBe('Superhero')
    expect(superhero?.colors.primary).toBeTruthy()
    expect(superhero?.colors.accent).toBeTruthy()
  })

  it('every theme has id, name, and three color swatches', () => {
    for (const theme of CAMPAIGN_THEMES) {
      expect(typeof theme.id).toBe('string')
      expect(theme.id.length).toBeGreaterThan(0)
      expect(typeof theme.name).toBe('string')
      expect(theme.name.length).toBeGreaterThan(0)
      expect(typeof theme.colors.background).toBe('string')
      expect(typeof theme.colors.primary).toBe('string')
      expect(typeof theme.colors.accent).toBe('string')
    }
  })

  it('all theme IDs are unique', () => {
    const ids = CAMPAIGN_THEMES.map((t) => t.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('includes all expected RPG themes', () => {
    const ids = CAMPAIGN_THEMES.map((t) => t.id)
    const expectedIds = [
      'default',
      'dark-fantasy',
      'cyberpunk',
      'cosmic-horror',
      'high-fantasy',
      'western',
      'steampunk',
      'eldritch',
      'fey-wilds',
      'undead',
      'superhero',
      'mage-ascension',
    ]
    for (const id of expectedIds) {
      expect(ids).toContain(id)
    }
  })
})

describe('Theme slug validation', () => {
  const validIds = new Set(CAMPAIGN_THEMES.map((t) => t.id))

  it('default is a valid theme ID', () => {
    expect(validIds.has('default')).toBe(true)
  })

  it('null/unknown theme slug falls back to default', () => {
    // Simulates the runtime fallback logic: theme || 'default'
    const resolve = (theme: string | null) => (theme && validIds.has(theme) ? theme : 'default')
    expect(resolve(null)).toBe('default')
    expect(resolve('')).toBe('default')
    expect(resolve('unknown-theme')).toBe('default')
    expect(resolve('cyberpunk')).toBe('cyberpunk')
    expect(resolve('superhero')).toBe('superhero')
  })

  it('includes the Mage: The Ascension theme with its violet/gold swatches', () => {
    const mage = CAMPAIGN_THEMES.find((t) => t.id === 'mage-ascension')
    expect(mage).toBeDefined()
    expect(mage?.name).toBe('Mage: The Ascension')
    // Carried over from wod20_web's [data-theme='mage'] so the two properties agree.
    expect(mage?.colors.background).toBe('#140b1f')
    expect(mage?.colors.primary).toBe('#c084fc')
    expect(mage?.colors.accent).toBeTruthy()
  })

  it('gives every theme a distinct id and a full swatch triple', () => {
    const ids = CAMPAIGN_THEMES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const t of CAMPAIGN_THEMES) {
      expect(t.colors.background).toMatch(/^#[0-9a-f]{6}$/i)
      expect(t.colors.primary).toMatch(/^#[0-9a-f]{6}$/i)
      expect(t.colors.accent).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})
