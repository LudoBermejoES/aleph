import { and, eq } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { entities } from '../db/schema/entities'
import { canUserAccessEntity, getCachedPermission, setCachedPermission } from '../utils/permissions'
import type { CampaignRole, Visibility } from '../utils/permissions'

export interface ResolveEntityInput {
  campaignId: string
  slug: string
  role: CampaignRole
  userId: string
}

/**
 * Resolve an entity of ANY type by slug and enforce read visibility exactly the way
 * `entities/[slug]/index.get.ts` does — the same `canUserAccessEntity` call, the same permission
 * cache, and a 404 (never a 403) for an entity the caller may not see, so the route does not leak
 * the existence of a `dm_only` entity.
 *
 * This is the generic sibling of `resolveReadableLocation` / `resolveReadableCharacter`; it exists
 * so the generic gallery routes reuse the one definition of "may this caller see this entity"
 * instead of adding a second visibility mechanism.
 *
 * Returns null when the entity does not exist or is not readable; callers turn that into a 404.
 */
export async function resolveReadableEntity(db: BetterSQLite3Database, input: ResolveEntityInput) {
  const entity = db
    .select()
    .from(entities)
    .where(and(eq(entities.campaignId, input.campaignId), eq(entities.slug, input.slug)))
    .get()
  if (!entity) return null

  const cached = getCachedPermission(input.userId, entity.id, 'view')
  const canAccess =
    cached !== null
      ? cached
      : await canUserAccessEntity(
          db,
          input.userId,
          'user',
          input.role,
          entity.id,
          entity.visibility as Visibility,
          entity.createdBy,
          'view',
        )
  if (cached === null) setCachedPermission(input.userId, entity.id, 'view', canAccess)

  return canAccess ? entity : null
}
