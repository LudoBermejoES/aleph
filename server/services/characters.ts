import { hasMinRole } from '../utils/permissions'
import type { CampaignRole } from '../utils/permissions'
import type { EntityFrontmatter } from './content'

interface StatEntry {
  id: string
  defIsSecret: boolean
  [key: string]: unknown
}

interface AbilityEntry {
  id: string
  isSecret: boolean
  [key: string]: unknown
}

/**
 * Filter out secret stats for non-DM/co-DM roles.
 */
export function stripSecretStats<T extends StatEntry>(stats: T[], role: string): T[] {
  if (hasMinRole(role as CampaignRole, 'co_dm')) return stats
  return stats.filter(s => !s.defIsSecret)
}

/**
 * Filter out secret abilities for non-DM/co-DM roles.
 */
export function stripSecretAbilities<T extends AbilityEntry>(abilities: T[], role: string): T[] {
  if (hasMinRole(role as CampaignRole, 'co_dm')) return abilities
  return abilities.filter(a => !a.isSecret)
}

/**
 * Check if a user can edit a character.
 * DM/co_dm/editor can edit any. Player can only edit their own.
 */
export function canEditCharacter(
  role: string,
  userId: string,
  ownerUserId: string | null,
): boolean {
  if (hasMinRole(role as CampaignRole, 'editor')) return true
  if (role === 'player' && ownerUserId && ownerUserId === userId) return true
  return false
}

/**
 * Build frontmatter for a character entity .md file.
 * Strips undefined values from fields to avoid YAML serialization errors.
 */
export function buildCharacterFrontmatter(opts: {
  id: string
  name: string
  characterType: string
  race?: string
  charClass?: string
  alignment?: string
  status?: string
  aliases?: string[]
  tags?: string[]
  visibility?: string
}): EntityFrontmatter & { fields: Record<string, string> } {
  const fields: Record<string, string> = {
    characterType: opts.characterType,
  }
  if (opts.race) fields.race = opts.race
  if (opts.charClass) fields.class = opts.charClass
  if (opts.alignment) fields.alignment = opts.alignment
  if (opts.status) fields.status = opts.status

  return {
    id: opts.id,
    type: 'character',
    name: opts.name,
    aliases: opts.aliases || [],
    tags: opts.tags || [],
    visibility: (opts.visibility || 'members') as EntityFrontmatter['visibility'],
    fields,
  }
}

/**
 * Generate a name for a duplicated character.
 */
export function buildDuplicateName(originalName: string): string {
  return `${originalName} (Copy)`
}
