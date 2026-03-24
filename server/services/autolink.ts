// --- Types ---

interface EntityNameEntry {
  id: string
  name: string
  aliases: string[]
}

interface MatchResult {
  entityId: string
  matchedText: string
  start: number
  end: number
}

interface ExclusionZone {
  start: number
  end: number
}

interface Automaton {
  patterns: Map<string, { entityId: string; originalText: string }>
}

// --- Automaton Builder ---

/**
 * Build a simple pattern matcher from entity names and aliases.
 * Uses lowercase patterns for case-insensitive matching.
 */
export function buildAutomaton(entities: EntityNameEntry[]): Automaton {
  const patterns = new Map<string, { entityId: string; originalText: string }>()

  for (const entity of entities) {
    patterns.set(entity.name.toLowerCase(), { entityId: entity.id, originalText: entity.name })
    for (const alias of entity.aliases) {
      patterns.set(alias.toLowerCase(), { entityId: entity.id, originalText: alias })
    }
  }

  return { patterns }
}

// --- Matching ---

function isWordChar(c: string): boolean {
  return /\w/.test(c)
}

/**
 * Find all entity name matches in text with word-boundary checking.
 */
export function findMatches(text: string, automaton: Automaton): MatchResult[] {
  const lowerText = text.toLowerCase()
  const matches: MatchResult[] = []

  // Sort patterns by length descending for longest-match preference
  const sortedPatterns = [...automaton.patterns.entries()].sort((a, b) => b[0].length - a[0].length)

  for (const [pattern, info] of sortedPatterns) {
    let searchStart = 0
    while (true) {
      const idx = lowerText.indexOf(pattern, searchStart)
      if (idx === -1) break

      // Word boundary check
      const charBefore = idx > 0 ? lowerText[idx - 1] : ' '
      const charAfter = idx + pattern.length < lowerText.length ? lowerText[idx + pattern.length] : ' '

      if (!isWordChar(charBefore) && !isWordChar(charAfter)) {
        matches.push({
          entityId: info.entityId,
          matchedText: text.substring(idx, idx + pattern.length),
          start: idx,
          end: idx + pattern.length,
        })
      }

      searchStart = idx + 1
    }
  }

  return matches
}

// --- Overlap Resolution ---

/**
 * Resolve overlapping matches: longest-match-wins.
 */
export function resolveOverlaps(matches: MatchResult[]): MatchResult[] {
  // Sort by start position, then by length descending
  const sorted = [...matches].sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))
  const resolved: MatchResult[] = []
  let lastEnd = -1

  for (const match of sorted) {
    if (match.start >= lastEnd) {
      resolved.push(match)
      lastEnd = match.end
    }
    // Skip overlapping shorter matches
  }

  return resolved
}

// --- Exclusion Zones ---

/**
 * Compute exclusion zones in markdown where auto-linking should not apply.
 */
export function computeExclusionZones(markdown: string): ExclusionZone[] {
  const zones: ExclusionZone[] = []

  // Frontmatter: ---...\n---
  const fmMatch = markdown.match(/^---[\s\S]*?---/)
  if (fmMatch) {
    zones.push({ start: 0, end: fmMatch[0].length })
  }

  // Fenced code blocks: ```...```
  for (const match of markdown.matchAll(/```[\s\S]*?```/g)) {
    zones.push({ start: match.index!, end: match.index! + match[0].length })
  }

  // Inline code: `...`
  for (const match of markdown.matchAll(/`[^`]+`/g)) {
    zones.push({ start: match.index!, end: match.index! + match[0].length })
  }

  // Markdown links: [text](url) and @[text](path)
  for (const match of markdown.matchAll(/@?\[[^\]]*\]\([^)]*\)/g)) {
    zones.push({ start: match.index!, end: match.index! + match[0].length })
  }

  // Headings: # ...
  for (const match of markdown.matchAll(/^#{1,6}\s+.+$/gm)) {
    zones.push({ start: match.index!, end: match.index! + match[0].length })
  }

  return zones.sort((a, b) => a.start - b.start)
}

// --- Exclusion Filtering ---

/**
 * Remove matches that fall inside exclusion zones.
 */
export function filterMatchesByExclusions(matches: MatchResult[], zones: ExclusionZone[]): MatchResult[] {
  return matches.filter(m =>
    !zones.some(z => m.start >= z.start && m.end <= z.end)
  )
}

// --- Campaign Automaton Cache ---

const cache = new Map<string, Automaton>()

export function getCachedAutomaton(campaignId: string): Automaton | undefined {
  return cache.get(campaignId)
}

export function setCachedAutomaton(campaignId: string, automaton: Automaton): void {
  cache.set(campaignId, automaton)
}

export function invalidateAutomatonCache(campaignId: string): void {
  cache.delete(campaignId)
}
