import { describe, it, expect } from 'vitest'
import {
  buildAutomaton,
  findMatches,
  resolveOverlaps,
  computeExclusionZones,
  filterMatchesByExclusions,
} from '../../server/services/autolink'

describe('buildAutomaton + findMatches', () => {
  it('finds a simple entity name', () => {
    const automaton = buildAutomaton([{ id: '1', name: 'Zoglin the Bold', aliases: [] }])
    const matches = findMatches('The party defeated Zoglin the Bold in the cave.', automaton)
    expect(matches).toHaveLength(1)
    expect(matches[0].matchedText).toBe('Zoglin the Bold')
  })

  it('is case-insensitive', () => {
    const automaton = buildAutomaton([{ id: '1', name: 'Sim Sim', aliases: [] }])
    const matches = findMatches('sim sim walked north.', automaton)
    expect(matches).toHaveLength(1)
  })

  it('respects word boundaries (does not match partial words)', () => {
    const automaton = buildAutomaton([{ id: '1', name: 'Orc', aliases: [] }])
    const matches = findMatches('Oracle and Orc appeared.', automaton)
    expect(matches).toHaveLength(1)
    expect(matches[0].matchedText).toBe('Orc')
  })

  it('matches entity names containing double quotes', () => {
    const automaton = buildAutomaton([{ id: '1', name: 'Durgan "Mediabarba" Garess', aliases: [] }])
    const matches = findMatches('Durgan "Mediabarba" Garess fired his crossbow.', automaton)
    expect(matches).toHaveLength(1)
    expect(matches[0].matchedText).toBe('Durgan "Mediabarba" Garess')
  })
})

describe('entity names with special characters', () => {
  it('escaping logic: double quotes in name become &quot; in MDC attribute', () => {
    const name = 'Durgan "Mediabarba" Garess'
    const slug = 'durgan-mediabarba-garess'
    const escapedName = name.replace(/"/g, '&quot;')
    const mdc = `:entity-link{slug="${slug}" name="${escapedName}"}`
    // Must not contain a raw " inside the attribute value
    const attrValue = mdc.match(/name="([^"]*)"/)
    expect(attrValue).not.toBeNull()
    expect(attrValue![1]).toBe('Durgan &quot;Mediabarba&quot; Garess')
  })

  it('matches entity names with double quotes in text', () => {
    const automaton = buildAutomaton([{ id: '1', name: 'Durgan "Mediabarba" Garess', aliases: [] }])
    const text = 'Durgan "Mediabarba" Garess fired his crossbow.'
    const exclusions = computeExclusionZones(text)
    const matches = filterMatchesByExclusions(findMatches(text, automaton), exclusions)
    expect(matches).toHaveLength(1)
    expect(matches[0].matchedText).toBe('Durgan "Mediabarba" Garess')
  })
})

describe('resolveOverlaps', () => {
  it('keeps the longer match when two overlap', () => {
    const matches = [
      { entityId: '1', matchedText: 'Laughlin Lodovka', start: 0, end: 16 },
      { entityId: '2', matchedText: 'Laughlin', start: 0, end: 8 },
    ]
    const resolved = resolveOverlaps(matches)
    expect(resolved).toHaveLength(1)
    expect(resolved[0].matchedText).toBe('Laughlin Lodovka')
  })
})
