import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Test quest list component with nesting logic (8.27)
 *
 * The quest list page uses rootQuests (no parentQuestId) and
 * childQuests(parentId) to render a nested quest tree.
 */

interface Quest {
  id: string
  name: string
  status: string
  parentQuestId: string | null
}

function rootQuests(quests: Quest[]): Quest[] {
  return quests.filter((q) => !q.parentQuestId)
}

function childQuests(quests: Quest[], parentId: string): Quest[] {
  return quests.filter((q) => q.parentQuestId === parentId)
}

const sampleQuests: Quest[] = [
  { id: '1', name: 'Main Quest: Defeat Strahd', status: 'active', parentQuestId: null },
  { id: '2', name: 'Find the Sunsword', status: 'active', parentQuestId: '1' },
  { id: '3', name: 'Find the Holy Symbol', status: 'completed', parentQuestId: '1' },
  { id: '4', name: 'Side Quest: Help Ireena', status: 'active', parentQuestId: null },
  { id: '5', name: 'Escort to Vallaki', status: 'active', parentQuestId: '4' },
  { id: '6', name: 'Talk to Ismark', status: 'completed', parentQuestId: '4' },
]

describe('Quest list nesting logic (8.27)', () => {
  it('rootQuests returns only quests without parentQuestId', () => {
    const roots = rootQuests(sampleQuests)
    expect(roots).toHaveLength(2)
    expect(roots.map((q) => q.name)).toEqual([
      'Main Quest: Defeat Strahd',
      'Side Quest: Help Ireena',
    ])
  })

  it('childQuests returns children of a specific parent', () => {
    const children = childQuests(sampleQuests, '1')
    expect(children).toHaveLength(2)
    expect(children.map((q) => q.name)).toEqual(['Find the Sunsword', 'Find the Holy Symbol'])
  })

  it('childQuests returns empty for quest with no children', () => {
    const children = childQuests(sampleQuests, '2')
    expect(children).toHaveLength(0)
  })

  it('childQuests returns empty for non-existent parent', () => {
    const children = childQuests(sampleQuests, 'nonexistent')
    expect(children).toHaveLength(0)
  })

  it('rootQuests returns all quests when none have parents', () => {
    const flat: Quest[] = [
      { id: '1', name: 'Q1', status: 'active', parentQuestId: null },
      { id: '2', name: 'Q2', status: 'active', parentQuestId: null },
    ]
    expect(rootQuests(flat)).toHaveLength(2)
  })

  it('empty quest list returns empty roots', () => {
    expect(rootQuests([])).toHaveLength(0)
  })

  it('nested structure: root → children → no grandchildren in flat list', () => {
    const roots = rootQuests(sampleQuests)
    for (const root of roots) {
      const children = childQuests(sampleQuests, root.id)
      expect(children.length).toBeGreaterThan(0)
      for (const child of children) {
        // No grandchildren in this sample
        expect(childQuests(sampleQuests, child.id)).toHaveLength(0)
      }
    }
  })
})

/**
 * Guard for the regression where the list printed `{{ q.description }}` raw inside a <p>.
 *
 * This one reads the PAGE, unlike the block above, which re-implements `rootQuests` /
 * `childQuests` in the test file and therefore cannot notice if the page stops matching it.
 * It is here rather than only in Playwright because `tests/e2e/` does NOT run in CI --
 * `.github/workflows` runs format, eslint, `vitest run tests/unit/`, the integration suite and
 * the build, and nothing else. A guard that only exists in the e2e suite is observed by
 * whoever remembers to run it, never enforced.
 */
describe('the quests list renders descriptions as excerpts', () => {
  const page = readFileSync(
    resolve(__dirname, '../../../app/pages/campaigns/[id]/quests/index.vue'),
    'utf-8',
  )

  it('never interpolates a quest description raw', () => {
    // Quest descriptions are markdown: raw interpolation prints `**` literally and lets HTML
    // collapse every newline, which is what turned a long description into a wall of text.
    expect(page).not.toMatch(/\{\{\s*q\.description\s*\}\}/)
  })

  it('routes the description through the shared excerpt helper', () => {
    expect(page).toContain("from '#shared/utils/text-excerpt'")
    expect(page).toMatch(/buildExcerpt\(/)
  })

  it('caps the card height so one long quest cannot push the rest off screen', () => {
    const descriptionBlock = page.slice(page.indexOf('questExcerpt(q.description)'))
    expect(descriptionBlock).toMatch(/line-clamp-\d/)
  })
})

/**
 * add-quest-short-description, design D4. The list has two branches and the DIFFERENT CSS CLASSES
 * are the whole point: the hand-written short description is capped at 200 chars server-side and
 * is therefore shown whole, with NO clamp; the excerpt of the long description has no guaranteed
 * length and IS clamped.
 *
 * Merging them — putting `line-clamp-2` on both "just in case" — is the regression this guards.
 * It would trim a short description at narrow widths, which is exactly the promise the field was
 * added to make, and nothing else in the suite would notice.
 */
describe('the quests list distinguishes the short description from the excerpt', () => {
  const page = readFileSync(
    resolve(__dirname, '../../../app/pages/campaigns/[id]/quests/index.vue'),
    'utf-8',
  )

  /** The `<p>` block for a branch, from its `v-if`/`v-else-if` to the closing tag. */
  function branch(marker: string): string {
    const start = page.indexOf(marker)
    expect(start, `branch not found: ${marker}`).toBeGreaterThan(-1)
    const open = page.lastIndexOf('<p', start)
    const close = page.indexOf('</p>', start)
    return page.slice(open, close)
  }

  it('renders the short description before falling back to the excerpt', () => {
    const short = page.indexOf('q.shortDescription')
    const excerpt = page.indexOf('questExcerpt(q.description)')
    expect(short).toBeGreaterThan(-1)
    expect(excerpt).toBeGreaterThan(-1)
    expect(short).toBeLessThan(excerpt)
    // The fallback must be an `v-else-if`, not a second independent `v-if`, or a quest holding
    // both fields would print two paragraphs.
    expect(page).toMatch(/v-else-if="questExcerpt\(q\.description\)"/)
  })

  it('never clamps the short description', () => {
    expect(branch('q.shortDescription')).not.toMatch(/line-clamp-\d/)
  })

  it('still clamps the excerpt, whose length is not guaranteed', () => {
    expect(branch('questExcerpt(q.description)')).toMatch(/line-clamp-\d/)
  })

  it('lets a long unbroken short description wrap instead of overflowing', () => {
    expect(branch('q.shortDescription')).toMatch(/break-words|break-all|wrap-anywhere/)
  })
})
