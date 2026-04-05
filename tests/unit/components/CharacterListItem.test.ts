import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const source = readFileSync(
  resolve(__dirname, '../../../app/components/characters/CharacterListItem.vue'),
  'utf-8',
)

describe('CharacterListItem', () => {
  it('renders status badge with alive class', () => {
    expect(source).toContain("character.status === 'alive'")
    expect(source).toContain('bg-green-100')
  })

  it('renders status badge with dead class', () => {
    expect(source).toContain("character.status === 'dead'")
    expect(source).toContain('bg-red-100')
  })

  it('renders status badge with missing class', () => {
    expect(source).toContain("character.status === 'missing'")
    expect(source).toContain('bg-amber-100')
  })

  it('renders data-testid status-badge', () => {
    expect(source).toContain('data-testid="status-badge"')
  })

  it('renders portrait via CharacterPortrait', () => {
    expect(source).toContain('CharacterPortrait')
    expect(source).toContain('character.portraitUrl')
  })

  it('renders race, class, alignment conditionally', () => {
    expect(source).toContain('character.race')
    expect(source).toContain('character.class')
    expect(source).toContain('character.alignment')
  })

  it('renders companion indicator', () => {
    expect(source).toContain('character.isCompanionOf')
    expect(source).toContain('characters.companion')
  })

  it('renders location indicator with testid', () => {
    expect(source).toContain('data-testid="location-indicator"')
    expect(source).toContain('character.locationName')
  })

  it('renders org badge with testid', () => {
    expect(source).toContain('data-testid="org-badge"')
    expect(source).toContain('character.primaryOrg')
  })

  it('links to character detail page', () => {
    expect(source).toContain('character.slug')
    expect(source).toContain('NuxtLink')
  })
})
