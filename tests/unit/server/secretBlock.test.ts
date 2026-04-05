import { describe, it, expect } from 'vitest'
import { SecretBlock } from '../../../server/extensions/secret-block'

describe('SecretBlock extension', () => {
  it('has correct node name', () => {
    expect(SecretBlock.name).toBe('secret-block')
  })

  it('markdownTokenizer tokenizes basic secret block', () => {
    const src = ':::secret{.dm}\nSome secret.\n:::\n'
    const tokenizer = SecretBlock.config?.markdownTokenizer as any
    if (!tokenizer) throw new Error('No markdownTokenizer')

    const fakeTokens: any[] = []
    const fakeLexer = {
      blockTokens: (text: string) => [{ type: 'paragraph', text, tokens: [] }],
      inlineTokens: (text: string) => [{ type: 'text', text }],
    }
    const token = tokenizer.tokenize(src, fakeTokens, fakeLexer)
    expect(token).toBeDefined()
    expect(token.type).toBe('secret-block')
    expect(token.role).toBe('dm')
    expect(token.secretId).toBeNull()
    expect(token.text).toBe('Some secret.')
  })

  it('markdownTokenizer captures #id attribute', () => {
    const src = ':::secret{.dm #my-secret-id}\nContent.\n:::\n'
    const tokenizer = SecretBlock.config?.markdownTokenizer as any
    const fakeLexer = {
      blockTokens: () => [],
      inlineTokens: () => [],
    }
    const token = tokenizer.tokenize(src, [], fakeLexer)
    expect(token?.secretId).toBe('my-secret-id')
    expect(token?.role).toBe('dm')
  })

  it('markdownTokenizer returns undefined for non-matching input', () => {
    const tokenizer = SecretBlock.config?.markdownTokenizer as any
    const fakeLexer = { blockTokens: () => [], inlineTokens: () => [] }
    const result = tokenizer.tokenize('regular paragraph\n', [], fakeLexer)
    expect(result).toBeUndefined()
  })

  it('renderMarkdown round-trips without id', () => {
    const renderMarkdown = SecretBlock.config?.renderMarkdown as any
    const fakeHelpers = { renderChildren: () => 'Inner content.\n' }
    const node = { attrs: { role: 'dm', id: null }, content: [] }
    const result = renderMarkdown(node, fakeHelpers)
    expect(result).toBe(':::secret{.dm}\nInner content.\n:::\n\n')
  })

  it('renderMarkdown round-trips with id', () => {
    const renderMarkdown = SecretBlock.config?.renderMarkdown as any
    const fakeHelpers = { renderChildren: () => 'Secret.\n' }
    const node = { attrs: { role: 'player', id: 'my-id' }, content: [] }
    const result = renderMarkdown(node, fakeHelpers)
    expect(result).toBe(':::secret{.player #my-id}\nSecret.\n:::\n\n')
  })

  it('parseMarkdown maps token fields to node attrs', () => {
    const parseMarkdown = SecretBlock.config?.parseMarkdown as any
    const fakeHelpers = { parseChildren: () => [] }
    const token = { role: 'co_dm', secretId: 'abc', tokens: [] }
    const node = parseMarkdown(token, fakeHelpers)
    expect(node.attrs.role).toBe('co_dm')
    expect(node.attrs.id).toBe('abc')
  })

  it('addAttributes includes id with null default', () => {
    const attrs = SecretBlock.config?.addAttributes?.()
    expect(attrs).toHaveProperty('id')
    expect(attrs?.id?.default).toBeNull()
  })

  it('HTML rendering includes data-secret-id when id present', () => {
    const attrs = SecretBlock.config?.addAttributes?.()
    const renderHTML = attrs?.id?.renderHTML
    expect(renderHTML?.({ id: 'test-id' })).toEqual({ 'data-secret-id': 'test-id' })
    expect(renderHTML?.({ id: null })).toEqual({})
  })

  it('HTML parsing reads data-secret-id attribute', () => {
    const attrs = SecretBlock.config?.addAttributes?.()
    const parseHTML = attrs?.id?.parseHTML
    const el = { getAttribute: (name: string) => name === 'data-secret-id' ? 'parsed-id' : null } as HTMLElement
    expect(parseHTML?.(el)).toBe('parsed-id')
  })
})
