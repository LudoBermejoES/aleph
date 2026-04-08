import { Node, type MarkdownLexerConfiguration, type MarkdownToken } from '@tiptap/core'

/**
 * Custom Tiptap block node for secret/conditional content blocks.
 *
 * Markdown (MDC) syntax:
 *   :::secret{.dm}
 *   Secret content here.
 *   :::
 *
 *   :::secret{.dm #my-secret-id}
 *   Secret with reveal ID.
 *   :::
 *
 *   :::secret{.player:alice}
 *   Only Alice sees this.
 *   :::
 *
 * HTML rendering: <div data-secret data-role="dm">content</div>
 *                 <div data-secret data-role="dm" data-secret-id="my-secret-id">content</div>
 */
export const SecretBlock = Node.create({
  name: 'secret-block',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      role: {
        default: 'dm',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-role'),
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-role': attributes.role,
        }),
      },
      id: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-secret-id') || null,
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.id ? { 'data-secret-id': attributes.id } : {},
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-secret]' }]
  },

  renderHTML({ node: _node, HTMLAttributes }) {
    return [
      'div',
      {
        'data-secret': '',
        ...HTMLAttributes,
        class: 'secret-block',
      },
      0,
    ] // 0 = render children here
  },

  // --- Markdown integration via @tiptap/markdown ---

  markdownTokenizer: {
    name: 'secret-block',
    level: 'block' as const,

    start(src: string) {
      return src.indexOf(':::secret{')
    },

    tokenize(src: string, _tokens: MarkdownToken[], lexer: MarkdownLexerConfiguration) {
      // Match :::secret{.role} or :::secret{.role #id}\ncontent\n:::
      const match = /^:::secret\{\.([^}#\s]+)(?:\s+#([^}]+))?\}\n([\s\S]*?)\n:::\n?/.exec(src)
      if (!match) return undefined

      // Add trailing newline so MarkedJS recognizes the paragraph properly
      const innerText = match[3].endsWith('\n') ? match[3] : match[3] + '\n'
      const innerTokens = lexer.blockTokens(innerText)
      // Populate inline tokens within each block token
      for (const tok of innerTokens) {
        if (tok.type === 'paragraph' && tok.text && (!tok.tokens || tok.tokens.length === 0)) {
          tok.tokens = lexer.inlineTokens(tok.text)
        }
      }

      return {
        type: 'secret-block',
        raw: match[0],
        role: match[1],
        secretId: match[2] || null,
        text: match[3],
        tokens: innerTokens,
      }
    },
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseMarkdown(token: any, helpers: any) {
    return {
      type: 'secret-block',
      attrs: { role: token.role || 'dm', id: token.secretId || null },
      content: helpers.parseChildren(token.tokens || []),
    }
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderMarkdown(node: any, helpers: any) {
    const role = node.attrs?.role || 'dm'
    const id = node.attrs?.id
    const content = helpers.renderChildren(node.content || [])
    const attrs = id ? `.${role} #${id}` : `.${role}`
    return `:::secret{${attrs}}\n${content}:::\n\n`
  },
})
