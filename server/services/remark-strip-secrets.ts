import { visit, SKIP } from 'unist-util-visit'
import type { Plugin } from 'unified'
import type { Root } from 'mdast'

interface StripSecretsOptions {
  userRole: string // 'dm', 'co_dm', 'editor', 'player', 'visitor'
  userId?: string
}

const ROLE_HIERARCHY: Record<string, number> = {
  dm: 5,
  co_dm: 4,
  editor: 3,
  player: 2,
  visitor: 1,
}

/**
 * Remark plugin that strips :::secret fences based on user role.
 *
 * Syntax:
 *   :::secret{.dm}                -- visible to DM and Co-DM only
 *   :::secret{.editor}            -- visible to Editor+
 *   :::secret{.player:alice,bob}  -- visible to specific users + DM/Co-DM
 */
export const remarkStripSecrets: Plugin<[StripSecretsOptions], Root> = (options) => {
  const { userRole, userId } = options

  return (tree) => {
    visit(tree, (node: any, index, parent) => {
      if (node.type !== 'containerDirective' || node.name !== 'secret') return

      const attrs = node.attributes || {}
      // remark-directive puts :::secret{.dm} as class="dm"
      // and :::secret{.player:alice,bob} as class="player:alice,bob"
      const secretSpec = attrs.class || attrs.id || ''

      // Parse the secret spec
      const colonIndex = secretSpec.indexOf(':')
      let requiredRole: string
      let allowedUsers: string[] = []

      if (colonIndex !== -1) {
        requiredRole = secretSpec.substring(0, colonIndex)
        allowedUsers = secretSpec.substring(colonIndex + 1).split(',').map((s: string) => s.trim())
      } else {
        requiredRole = secretSpec || 'dm'
      }

      // DM and Co-DM always see everything
      if ((ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY['co_dm'] ?? 4)) return

      // User-specific secret: only listed users (+ DM/Co-DM) can see
      if (allowedUsers.length > 0) {
        if (userId && allowedUsers.includes(userId)) return
        // Not in the list -> remove
      } else {
        // Role-based secret: anyone at or above the required role can see
        const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 5
        if ((ROLE_HIERARCHY[userRole] ?? 0) >= requiredLevel) return
      }

      // Remove the node
      if (parent && typeof index === 'number') {
        parent.children.splice(index, 1)
        return [SKIP, index]
      }
    })
  }
}
