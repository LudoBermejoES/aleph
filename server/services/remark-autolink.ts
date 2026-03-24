import { visit } from 'unist-util-visit'
import type { Plugin } from 'unified'
import type { Root, Text, PhrasingContent } from 'mdast'
import {
  buildAutomaton,
  findMatches,
  computeExclusionZones,
  filterMatchesByExclusions,
  resolveOverlaps,
  getCachedAutomaton,
} from './autolink'

interface AutoLinkOptions {
  campaignId: string
  entities: Array<{ id: string; name: string; aliases: string[] }>
}

/**
 * Remark plugin that auto-links entity names in markdown text nodes.
 * Replaces matched entity names with :entity-link MDC inline components.
 * Applied at render time only -- source .md files are never modified.
 */
export const remarkAutoLink: Plugin<[AutoLinkOptions], Root> = (options) => {
  const { campaignId, entities } = options

  // Build or get cached automaton
  let automaton = getCachedAutomaton(campaignId)
  if (!automaton) {
    automaton = buildAutomaton(entities)
  }

  return (tree) => {
    // First, compute exclusion zones from the source markdown
    // We'll skip text nodes inside code, links, etc. by checking parent types
    const skipParents = new Set(['code', 'inlineCode', 'link', 'image', 'yaml', 'heading'])

    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || !automaton) return
      if (skipParents.has(parent.type)) return
      if (typeof index !== 'number') return

      const text = node.value
      const matches = findMatches(text, automaton)
      if (matches.length === 0) return

      const resolved = resolveOverlaps(matches)
      if (resolved.length === 0) return

      // Build replacement nodes: text + entity-link + text + ...
      const children: PhrasingContent[] = []
      let lastEnd = 0

      for (const match of resolved) {
        // Text before match
        if (match.start > lastEnd) {
          children.push({ type: 'text', value: text.substring(lastEnd, match.start) })
        }

        // Entity link (MDC inline component syntax)
        children.push({
          type: 'textDirective' as any,
          name: 'entity-link',
          attributes: { slug: match.entityId },
          children: [{ type: 'text', value: match.matchedText }],
        } as any)

        lastEnd = match.end
      }

      // Remaining text
      if (lastEnd < text.length) {
        children.push({ type: 'text', value: text.substring(lastEnd) })
      }

      // Replace the text node with the new children
      parent.children.splice(index, 1, ...children)
    })
  }
}
