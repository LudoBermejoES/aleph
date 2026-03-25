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

describe('tiptapToMarkdown', () => {
  it('converts Tiptap JSON back to markdown', () => {
    const json = markdownToTiptap('# Hello\n\nSome **bold** text.')
    const md = tiptapToMarkdown(json)
    expect(md).toContain('# Hello')
    expect(md).toContain('**bold**')
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
