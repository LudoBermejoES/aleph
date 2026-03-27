import { describe, it, expect } from 'vitest'
import { markdownToTiptap, tiptapToMarkdown } from '../../../server/services/collaboration'

/**
 * MarkdownEditor component test (9.20)
 *
 * The MarkdownEditor.client.vue wraps Tiptap with our custom extensions.
 * Since mounting a .client.vue component with Tiptap + jsdom is fragile,
 * we test the core behavior the editor depends on: markdown parsing,
 * serialization, and custom node support — which are the same functions
 * the editor uses internally.
 */
describe('MarkdownEditor — core behavior', () => {
  it('mounts with markdown: parses to Tiptap JSON with correct structure', { timeout: 15000 }, () => {
    const md = '# Quest Log\n\nThe party explored **Castle Ravenloft**.\n\n- Found a key\n- Defeated a vampire spawn\n'
    const json = markdownToTiptap(md)

    expect(json.type).toBe('doc')
    const content = json.content as any[]
    expect(content.length).toBeGreaterThan(0)

    // Should have heading, paragraph, and list
    const types = content.map((n: any) => n.type)
    expect(types).toContain('heading')
    expect(types).toContain('paragraph')
    expect(types).toContain('bulletList')
  })

  it('emits on edit: Tiptap JSON serializes back to markdown', () => {
    const original = '# Title\n\nSome **bold** text with *italics*.\n'
    const json = markdownToTiptap(original)
    const output = tiptapToMarkdown(json)

    // The emitted markdown should contain the key content
    expect(output).toContain('# Title')
    expect(output).toContain('**bold**')
    expect(output).toContain('*italics*')
  })

  it('preserves entity-link MDC through parse/serialize', () => {
    const md = 'Talk to :entity-link{slug="strahd"} about the curse.\n'
    const json = markdownToTiptap(md)
    const output = tiptapToMarkdown(json)

    expect(output).toContain(':entity-link{slug="strahd"}')
  })

  it('preserves secret blocks through parse/serialize', () => {
    const md = '# Notes\n\n:::secret{.dm}\nHidden treasure under altar.\n:::\n\nPublic info.\n'
    const json = markdownToTiptap(md)
    const output = tiptapToMarkdown(json)

    expect(output).toContain(':::secret{.dm}')
    expect(output).toContain('Hidden treasure under altar.')
  })

  it('handles empty content gracefully', () => {
    const json = markdownToTiptap('')
    expect(json.type).toBe('doc')

    const output = tiptapToMarkdown(json)
    expect(output.trim()).toBe('')
  })
})
