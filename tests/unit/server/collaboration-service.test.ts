import { describe, it, expect } from 'vitest'
import {
  mergeFrontmatter,
  isRoundTripSafe,
  markdownToTiptap,
  tiptapToMarkdown,
} from '../../../server/services/collaboration'

describe('mergeFrontmatter', () => {
  it('preserves unchanged fields', () => {
    const existing = { name: 'Strahd', type: 'character', created: '2026-01-01', modified: '2026-01-01' }
    const updated = {}
    const result = mergeFrontmatter(existing, updated)
    expect(result.name).toBe('Strahd')
    expect(result.type).toBe('character')
  })

  it('updates changed fields', () => {
    const existing = { name: 'Strahd', type: 'character', created: '2026-01-01', modified: '2026-01-01' }
    const updated = { name: 'Strahd von Zarovich' }
    const result = mergeFrontmatter(existing, updated)
    expect(result.name).toBe('Strahd von Zarovich')
    expect(result.type).toBe('character')
  })

  it('never overwrites created_at/created', () => {
    const existing = { name: 'Strahd', created: '2026-01-01', modified: '2026-01-01' }
    const updated = { created: '2099-12-31' }
    const result = mergeFrontmatter(existing, updated)
    expect(result.created).toBe('2026-01-01')
  })

  it('updates modified timestamp', () => {
    const existing = { name: 'Strahd', created: '2026-01-01', modified: '2026-01-01' }
    const result = mergeFrontmatter(existing, {})
    expect(result.modified).not.toBe('2026-01-01')
  })

  it('adds new fields from updated', () => {
    const existing = { name: 'Strahd' }
    const updated = { tags: ['vampire'] }
    const result = mergeFrontmatter(existing, updated)
    expect(result.tags).toEqual(['vampire'])
  })
})

describe('markdownToTiptap', () => {
  it('converts heading to Tiptap JSON', () => {
    const json = markdownToTiptap('# Hello World')
    expect(json).toBeDefined()
    expect(json.type).toBe('doc')
    const heading = json.content?.find((n: any) => n.type === 'heading')
    expect(heading).toBeDefined()
  })

  it('converts bold text', () => {
    const json = markdownToTiptap('This is **bold** text')
    expect(json).toBeDefined()
    expect(JSON.stringify(json)).toContain('bold')
  })

  it('converts bullet list', () => {
    const json = markdownToTiptap('- Item 1\n- Item 2')
    expect(json).toBeDefined()
    const list = json.content?.find((n: any) => n.type === 'bulletList')
    expect(list).toBeDefined()
  })
})

describe('markdownToTiptap — entity-link MDC', () => {
  // RED phase: these tests require the custom entity-link Tiptap node (task 2.5)
  it.skip('converts :entity-link{slug="strahd"} MDC to entity-link Tiptap node', () => {
    const md = 'The vampire :entity-link{slug="strahd"} rules Barovia.'
    const json = markdownToTiptap(md)
    // Should produce a dedicated entity-link node, not plain text
    const nodes = (json.content as any[]).flatMap((n: any) => n.content || [])
    const entityNode = nodes.find((n: any) => n.type === 'entity-link')
    expect(entityNode).toBeDefined()
    expect(entityNode.attrs.slug).toBe('strahd')
  })

  it.skip('converts :entity-link{slug="barovia" label="Village of Barovia"} with label', () => {
    const md = 'They arrived at :entity-link{slug="barovia" label="Village of Barovia"}.'
    const json = markdownToTiptap(md)
    const nodes = (json.content as any[]).flatMap((n: any) => n.content || [])
    const entityNode = nodes.find((n: any) => n.type === 'entity-link')
    expect(entityNode).toBeDefined()
    expect(entityNode.attrs.slug).toBe('barovia')
    expect(entityNode.attrs.label).toBe('Village of Barovia')
  })
})

describe('tiptapToMarkdown', () => {
  it('converts Tiptap JSON back to markdown', () => {
    const json = markdownToTiptap('# Hello\n\nSome **bold** text.')
    const md = tiptapToMarkdown(json)
    expect(md).toContain('# Hello')
    expect(md).toContain('**bold**')
  })
})

describe('tiptapToMarkdown — entity-link node', () => {
  // RED phase: these tests require the custom entity-link Tiptap node (task 2.5)
  it.skip('converts entity-link Tiptap node back to :entity-link{slug} MDC syntax', () => {
    // Build Tiptap JSON with an entity-link node
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'The vampire ' },
            { type: 'entity-link', attrs: { slug: 'strahd' } },
            { type: 'text', text: ' rules Barovia.' },
          ],
        },
      ],
    }
    const md = tiptapToMarkdown(json)
    expect(md).toContain(':entity-link{slug="strahd"}')
  })

  it.skip('round-trips entity-link MDC through Tiptap', () => {
    const original = 'The vampire :entity-link{slug="strahd"} rules Barovia.\n'
    const json = markdownToTiptap(original)
    const result = tiptapToMarkdown(json)
    expect(result).toContain(':entity-link{slug="strahd"}')
  })
})

describe('isRoundTripSafe', () => {
  it('simple markdown round-trips safely', () => {
    const md = '# Title\n\nA paragraph with **bold** and *italic*.\n\n- List item 1\n- List item 2\n'
    expect(isRoundTripSafe(md)).toBe(true)
  })

  it('empty string is round-trip safe', () => {
    expect(isRoundTripSafe('')).toBe(true)
  })
})

describe('secret block round-trip', () => {
  // RED phase: these tests require the custom secret-block Tiptap node (task 2.6)
  it.skip(':::secret{.dm} block with content round-trips correctly', () => {
    const md = '# Quest Notes\n\n:::secret{.dm}\nThe treasure is hidden under the altar.\n:::\n\nVisible content here.\n'
    const json = markdownToTiptap(md)
    const result = tiptapToMarkdown(json)
    // Secret block must survive the round-trip
    expect(result).toContain(':::secret{.dm}')
    expect(result).toContain('The treasure is hidden under the altar.')
    expect(result).toContain(':::')
  })

  it.skip(':::secret{.player:alice} block round-trips with role annotation', () => {
    const md = '# Session Notes\n\n:::secret{.player:alice}\nAlice sees a hidden passage.\n:::\n\nEveryone sees this.\n'
    const json = markdownToTiptap(md)
    const result = tiptapToMarkdown(json)
    expect(result).toContain(':::secret{.player:alice}')
    expect(result).toContain('Alice sees a hidden passage.')
  })
})
