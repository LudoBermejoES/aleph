import { Node } from '@tiptap/core'

/**
 * Custom Tiptap block node for secret/conditional content blocks.
 *
 * Markdown (MDC) syntax:
 *   :::secret{.dm}
 *   Secret content here.
 *   :::
 *
 *   :::secret{.player:alice}
 *   Only Alice sees this.
 *   :::
 *
 * HTML rendering: <div data-secret data-role="dm">content</div>
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
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-secret]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['div', {
      'data-secret': '',
      ...HTMLAttributes,
      class: 'secret-block',
    }, 0] // 0 = render children here
  },

  // --- Markdown integration via @tiptap/markdown ---

  markdownTokenizer: {
    name: 'secret-block',
    level: 'block' as const,

    start(src: string) {
      return src.indexOf(':::secret{')
    },

    tokenize(src: string, _tokens: any, lexer: any) {
      // Match :::secret{.role}\ncontent\n:::
      const match = /^:::secret\{\.([^}]+)\}\n([\s\S]*?)\n:::\n?/.exec(src)
      if (!match) return undefined

      // Add trailing newline so MarkedJS recognizes the paragraph properly
      const innerText = match[2].endsWith('\n') ? match[2] : match[2] + '\n'
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
        text: match[2],
        tokens: innerTokens,
      }
    },
  },

  parseMarkdown(token: any, helpers: any) {
    return {
      type: 'secret-block',
      attrs: { role: token.role || 'dm' },
      content: helpers.parseChildren(token.tokens || []),
    }
  },

  renderMarkdown(node: any, helpers: any) {
    const role = node.attrs?.role || 'dm'
    const content = helpers.renderChildren(node.content || [])
    return `:::secret{.${role}}\n${content}:::\n\n`
  },
})
