import { eq, and } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { createError } from 'h3'
import {
  hasMinRole,
  canUserAccessEntity,
  getCachedPermission,
  setCachedPermission,
} from '../utils/permissions'
import type { CampaignRole, Visibility } from '../utils/permissions'
import { entities } from '../db/schema/entities'
import { characters } from '../db/schema/characters'
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
  return stats.filter((s) => !s.defIsSecret)
}

/**
 * Filter out secret abilities for non-DM/co-DM roles.
 */
export function stripSecretAbilities<T extends AbilityEntry>(abilities: T[], role: string): T[] {
  if (hasMinRole(role as CampaignRole, 'co_dm')) return abilities
  return abilities.filter((a) => !a.isSecret)
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
 * Check if a campaign role may write a public note on a character.
 *
 * Deliberately NOT folded into `canEditCharacter()`: widening that would let the note
 * permission leak into `PUT /characters/:slug`, which is the one thing the public-notes
 * capability must not do. Readability is the other half of the gate and is enforced by
 * `resolveReadableCharacter()` — a caller who cannot read the character never reaches here.
 *
 * `visitor` is refused: a visitor is a read-only observer of the campaign, and handing the
 * least-privileged role a write path is the kind of thing that gets discovered by accident.
 */
export function canAnnotateCharacter(role: CampaignRole | string): boolean {
  return role === 'dm' || role === 'co_dm' || role === 'editor' || role === 'player'
}

/**
 * Normalise a submitted note body into what should be stored.
 *
 * Returns `null` when the body is empty or whitespace-only, which the caller must treat as
 * "delete the row" — the character page must never render an empty attributed block.
 */
export function normalizeNoteBody(body: string): string | null {
  const trimmed = body.trim()
  return trimmed.length === 0 ? null : trimmed
}

/**
 * Resolve a character by campaign + slug through the READ visibility path.
 *
 * This is the single definition of "may this caller see this character", shared verbatim by
 * `GET /characters/:slug` and both `/notes/me` routes. Reusing it is what makes an unreadable
 * character answer `404` on the note routes too — the same response as reading it, revealing
 * nothing about whether the character exists.
 *
 * Throws a 404 (never a 403) when the entity is missing or not visible to the caller.
 */
export async function resolveReadableCharacter(
  db: BetterSQLite3Database,
  campaignId: string,
  slug: string,
  userId: string,
  role: CampaignRole,
) {
  const entity = db
    .select()
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Character not found' })

  const cached = getCachedPermission(userId, entity.id, 'view')
  const canAccess =
    cached !== null
      ? cached
      : await canUserAccessEntity(
          db,
          userId,
          'user',
          role,
          entity.id,
          entity.visibility as Visibility,
          entity.createdBy,
          'view',
        )
  if (cached === null) setCachedPermission(userId, entity.id, 'view', canAccess)
  if (!canAccess) throw createError({ statusCode: 404, message: 'Character not found' })

  const character = db.select().from(characters).where(eq(characters.entityId, entity.id)).get()
  if (!character) throw createError({ statusCode: 404, message: 'Character data not found' })

  return { entity, character }
}

/**
 * Build frontmatter for a character entity .md file.
 * Strips undefined values from fields to avoid YAML serialization errors.
 */
export function buildCharacterFrontmatter(opts: {
  id: string
  name: string
  characterType: string
  status?: string
  aliases?: string[]
  tags?: string[]
  visibility?: string
  fields?: Record<string, unknown>
}): EntityFrontmatter & { fields: Record<string, unknown> } {
  const fields: Record<string, unknown> = {
    characterType: opts.characterType,
    ...(opts.fields ?? {}),
  }
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
