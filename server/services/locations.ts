import { and, eq } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { entities } from '../db/schema/entities'
import { canUserAccessEntity, getCachedPermission, setCachedPermission } from '../utils/permissions'
import type { CampaignRole, Visibility } from '../utils/permissions'

export interface ResolveLocationInput {
  campaignId: string
  slug: string
  role: CampaignRole
  userId: string
}

/**
 * Resolve a location by slug and enforce read visibility the same way `locations/[slug].get.ts`
 * does — a location the caller may not see answers 404, never 403, so the endpoint does not leak
 * the existence of hidden locations.
 *
 * Returns null when the location does not exist or is not readable; callers turn that into a 404.
 */
export async function resolveReadableLocation(
  db: BetterSQLite3Database,
  input: ResolveLocationInput,
) {
  const entity = db
    .select()
    .from(entities)
    .where(
      and(
        eq(entities.campaignId, input.campaignId),
        eq(entities.slug, input.slug),
        eq(entities.type, 'location'),
      ),
    )
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
