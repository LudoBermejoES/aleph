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
 *   :::secret dm          -- visible to DM and Co-DM only
 *   :::secret editor      -- visible to Editor+
 *   :::secret player:alice,bob  -- visible to specific users + DM
 */
export const remarkStripSecrets: Plugin<[StripSecretsOptions], Root> = (options) => {
  const { userRole, userId } = options

  return (tree) => {
    visit(tree, (node: any, index, parent) => {
      // remark-directive parses :::name into containerDirective nodes
      if (node.type !== 'containerDirective' || node.name !== 'secret') return

      const attrs = node.attributes || {}
      const secretSpec = attrs.class || attrs.id || ''

      // Parse the secret spec
      // "dm" -> role-based, "player:alice,bob" -> user-specific
      const colonIndex = secretSpec.indexOf(':')
      let requiredRole: string
      let allowedUsers: string[] = []

      if (colonIndex !== -1) {
        requiredRole = secretSpec.substring(0, colonIndex)
        allowedUsers = secretSpec.substring(colonIndex + 1).split(',').map((s: string) => s.trim())
      } else {
        requiredRole = secretSpec || 'dm'
      }

      // DM always sees everything
      if (ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY.dm) return

      // Check user-specific access
      if (allowedUsers.length > 0 && userId && allowedUsers.includes(userId)) return

      // Check role-based access
      const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? ROLE_HIERARCHY.dm
      if (ROLE_HIERARCHY[userRole] >= requiredLevel) return

      // Remove the node
      if (parent && typeof index === 'number') {
        parent.children.splice(index, 1)
        return [SKIP, index]
      }
    })
  }
}
