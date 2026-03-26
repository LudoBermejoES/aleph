import { Node, mergeAttributes } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import type { SuggestionOptions } from '@tiptap/suggestion'

export interface EntityMentionOptions {
  suggestion: Partial<SuggestionOptions>
  campaignId: string
}

/**
 * EntityMention extension for Tiptap.
 *
 * Triggers on `@` character, fetches entity suggestions from the API,
 * and inserts an entity-link node when selected.
 */
export const EntityMention = Node.create<EntityMentionOptions>({
  name: 'entityMention',
  group: 'inline',
  inline: true,
  selectable: false,
  atom: true,

  addOptions() {
    return {
      campaignId: '',
      suggestion: {
        char: '@',
        allowSpaces: true,
        startOfLine: false,
      },
    }
  },

  addAttributes() {
    return {
      slug: { default: null },
      label: { default: null },
      id: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-entity-mention]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      'data-entity-mention': '',
      'data-slug': node.attrs.slug,
      class: 'entity-mention',
    }), `@${node.attrs.label || node.attrs.slug}`]
  },

  renderText({ node }) {
    return `:entity-link{slug="${node.attrs.slug}"${node.attrs.label ? ` label="${node.attrs.label}"` : ''}}`
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})
