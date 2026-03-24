import { describe, it, expect } from 'vitest'
import {
  buildAutomaton,
  findMatches,
  computeExclusionZones,
  filterMatchesByExclusions,
  resolveOverlaps,
} from '../../../server/services/autolink'

describe('buildAutomaton', () => {
  it('builds from entity names without error', () => {
    const automaton = buildAutomaton([
      { id: '1', name: 'Elara', aliases: [] },
      { id: '2', name: "Elara's Keep", aliases: [] },
      { id: '3', name: 'Orc', aliases: [] },
    ])
    expect(automaton).toBeDefined()
    expect(automaton.patterns.size).toBe(3)
  })

  it('includes aliases', () => {
    const automaton = buildAutomaton([
      { id: '1', name: 'Strahd von Zarovich', aliases: ['Strahd', 'The Devil'] },
    ])
    expect(automaton.patterns.size).toBe(3)
  })
})

describe('findMatches', () => {
  const automaton = buildAutomaton([
    { id: '1', name: 'Elara', aliases: [] },
    { id: '2', name: "Elara's Keep", aliases: [] },
    { id: '3', name: 'Orc', aliases: [] },
  ])

  it('finds case-insensitive matches', () => {
    const matches = findMatches('The hero visited elara today', automaton)
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(matches[0].entityId).toBe('1')
  })

  it('ELARA also matches', () => {
    const matches = findMatches('ELARA is powerful', automaton)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('matches Orc with word boundaries', () => {
    const matches = findMatches('the Orc attacked', automaton)
    expect(matches.some(m => m.entityId === '3')).toBe(true)
  })

  it('does not match Orc inside Orca', () => {
    const matches = findMatches('the Orca whale swam', automaton)
    const orcMatches = matches.filter(m => m.entityId === '3')
    expect(orcMatches).toHaveLength(0)
  })
})

describe('resolveOverlaps', () => {
  it('longest-match-wins', () => {
    const matches = [
      { entityId: '1', matchedText: 'Elara', start: 8, end: 13 },
      { entityId: '2', matchedText: "Elara's Keep", start: 8, end: 20 },
    ]
    const resolved = resolveOverlaps(matches)
    expect(resolved).toHaveLength(1)
    expect(resolved[0].entityId).toBe('2')
  })

  it('non-overlapping matches both kept', () => {
    const matches = [
      { entityId: '1', matchedText: 'Elara', start: 0, end: 5 },
      { entityId: '3', matchedText: 'Orc', start: 20, end: 23 },
    ]
    const resolved = resolveOverlaps(matches)
    expect(resolved).toHaveLength(2)
  })
})

describe('computeExclusionZones', () => {
  it('identifies code blocks', () => {
    const md = "Some text\n```\nElara\n```\nMore text"
    const zones = computeExclusionZones(md)
    expect(zones.some(z => z.start <= 14 && z.end >= 19)).toBe(true) // "Elara" inside code
  })

  it('identifies inline code', () => {
    const md = "Use `Elara` as a variable"
    const zones = computeExclusionZones(md)
    expect(zones.some(z => z.start <= 4 && z.end >= 11)).toBe(true)
  })

  it('identifies existing links', () => {
    const md = "Visit [Elara](http://example.com)"
    const zones = computeExclusionZones(md)
    expect(zones.length).toBeGreaterThanOrEqual(1)
  })

  it('identifies frontmatter', () => {
    const md = "---\nname: Elara\n---\nContent"
    const zones = computeExclusionZones(md)
    expect(zones.some(z => z.start === 0)).toBe(true)
  })
})

describe('filterMatchesByExclusions', () => {
  it('filters matches inside exclusion zones', () => {
    const matches = [
      { entityId: '1', matchedText: 'Elara', start: 10, end: 15 },
    ]
    const zones = [{ start: 8, end: 20 }]
    const filtered = filterMatchesByExclusions(matches, zones)
    expect(filtered).toHaveLength(0)
  })

  it('keeps matches outside exclusion zones', () => {
    const matches = [
      { entityId: '1', matchedText: 'Elara', start: 30, end: 35 },
    ]
    const zones = [{ start: 0, end: 20 }]
    const filtered = filterMatchesByExclusions(matches, zones)
    expect(filtered).toHaveLength(1)
  })
})
