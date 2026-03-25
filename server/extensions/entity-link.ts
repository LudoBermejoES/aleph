import { Node } from '@tiptap/core'

/**
 * Custom Tiptap inline node for entity links.
 *
 * Markdown (MDC) syntax: :entity-link{slug="strahd"} or :entity-link{slug="strahd" label="Strahd von Zarovich"}
 * HTML rendering: <a data-entity-link data-slug="strahd">label or slug</a>
 */
export const EntityLink = Node.create({
  name: 'entity-link',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      slug: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-slug'),
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-slug': attributes.slug,
        }),
      },
      label: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-label'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.label) return {}
          return { 'data-label': attributes.label }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'a[data-entity-link]' }]
  },

  renderHTML({ node }) {
    const label = node.attrs.label || node.attrs.slug || 'unknown'
    return ['a', {
      'data-entity-link': '',
      'data-slug': node.attrs.slug,
      ...(node.attrs.label ? { 'data-label': node.attrs.label } : {}),
      class: 'entity-link',
      href: '#', // Placeholder; client-side routing handles navigation
    }, label]
  },

  // --- Markdown integration via @tiptap/markdown ---

  markdownTokenizer: {
    name: 'entity-link',
    level: 'inline' as const,

    start(src: string) {
      return src.indexOf(':entity-link{')
    },

    tokenize(src: string) {
      // Match :entity-link{slug="value"} or :entity-link{slug="value" label="value"}
      const match = /^:entity-link\{([^}]+)\}/.exec(src)
      if (!match) return undefined

      const attrsStr = match[1]
      const slugMatch = /slug="([^"]*)"/.exec(attrsStr)
      const labelMatch = /label="([^"]*)"/.exec(attrsStr)

      if (!slugMatch) return undefined

      return {
        type: 'entity-link',
        raw: match[0],
        slug: slugMatch[1],
        label: labelMatch?.[1] || null,
      }
    },
  },

  parseMarkdown(token: any) {
    return {
      type: 'entity-link',
      attrs: {
        slug: token.slug,
        label: token.label || null,
      },
    }
  },

  renderMarkdown(node: any) {
    const slug = node.attrs?.slug || 'unknown'
    const label = node.attrs?.label
    if (label) {
      return `:entity-link{slug="${slug}" label="${label}"}`
    }
    return `:entity-link{slug="${slug}"}`
  },
})
