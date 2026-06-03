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
      type: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-type'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.type) return {}
          return { 'data-type': attributes.type }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'a[data-entity-link]' }]
  },

  renderHTML({ node }) {
    const label = node.attrs.label || node.attrs.slug || 'unknown'
    return [
      'a',
      {
        'data-entity-link': '',
        'data-slug': node.attrs.slug,
        ...(node.attrs.label ? { 'data-label': node.attrs.label } : {}),
        ...(node.attrs.type ? { 'data-type': node.attrs.type } : {}),
        class: 'entity-link',
        href: '#',
      },
      label,
    ]
  },

  // --- Markdown integration via @tiptap/markdown ---

  markdownTokenizer: {
    name: 'entity-link',
    level: 'inline' as const,

    start(src: string) {
      return src.indexOf(':entity-link{')
    },

    tokenize(src: string) {
      // Match :entity-link{slug="value"} with optional label and type attrs
      const match = /^:entity-link\{([^}]+)\}/.exec(src)
      if (!match) return undefined

      const attrsStr = match[1]
      const slugMatch = /slug="([^"]*)"/.exec(attrsStr)
      const labelMatch = /label="([^"]*)"/.exec(attrsStr)
      const typeMatch = /type="([^"]*)"/.exec(attrsStr)

      if (!slugMatch) return undefined

      return {
        type: 'entity-link',
        raw: match[0],
        slug: slugMatch[1],
        label: labelMatch?.[1] || null,
        entityType: typeMatch?.[1] || null,
      }
    },
  },

  parseMarkdown(token: Record<string, unknown>) {
    return {
      type: 'entity-link',
      attrs: {
        slug: token.slug,
        label: token.label || null,
        type: token.entityType || null,
      },
    }
  },

  renderMarkdown(node: { attrs?: Record<string, unknown> }) {
    const slug = node.attrs?.slug || 'unknown'
    const label = node.attrs?.label
    const type = node.attrs?.type
    const typeAttr = type ? ` type="${type}"` : ''
    if (label) {
      return `:entity-link{slug="${slug}" label="${label}"${typeAttr}}`
    }
    return `:entity-link{slug="${slug}"${typeAttr}}`
  },
})
