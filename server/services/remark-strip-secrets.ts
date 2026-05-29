import { visit, SKIP } from 'unist-util-visit'
import type { Plugin } from 'unified'
import type { Root } from 'mdast'
import type { Node } from 'unist'
import { ROLE_HIERARCHY } from '../utils/permissions'
import type { CampaignRole } from '../utils/permissions'

interface StripSecretsOptions {
  userRole: string // 'dm', 'co_dm', 'editor', 'player', 'visitor'
  userId?: string
}

function roleLevel(role: string): number {
  return ROLE_HIERARCHY[role as CampaignRole] ?? 0
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
    visit(tree, (node: Node & Record<string, unknown>, index, parent) => {
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
        allowedUsers = secretSpec
          .substring(colonIndex + 1)
          .split(',')
          .map((s: string) => s.trim())
      } else {
        requiredRole = secretSpec || 'dm'
      }

      // DM and Co-DM always see everything
      if (roleLevel(userRole) >= roleLevel('co_dm')) return

      // User-specific secret: only listed users (+ DM/Co-DM) can see
      if (allowedUsers.length > 0) {
        if (userId && allowedUsers.includes(userId)) return
        // Not in the list -> remove
      } else {
        // Role-based secret: anyone at or above the required role can see
        if (roleLevel(userRole) >= roleLevel(requiredRole)) return
      }

      // Remove the node
      if (parent && typeof index === 'number') {
        parent.children.splice(index, 1)
        return [SKIP, index]
      }
    })
  }
}
