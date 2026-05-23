import { eq, and } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { organizationMembers, organizationLocations } from '../db/schema/organizations'

export function updateMemberRole(
  db: BetterSQLite3Database,
  organizationId: string,
  characterId: string,
  role: string,
) {
  const existing = db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.characterId, characterId),
      ),
    )
    .get()

  if (!existing) {
    throw Object.assign(new Error('Member not found in this organization'), { statusCode: 404 })
  }

  const normalizedRole = role.trim() || null

  db.update(organizationMembers)
    .set({ role: normalizedRole })
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.characterId, characterId),
      ),
    )
    .run()

  return { organizationId, characterId, role: normalizedRole }
}

export function updateLocationOrgDescription(
  db: BetterSQLite3Database,
  locationEntityId: string,
  organizationId: string,
  description: string,
) {
  const existing = db
    .select()
    .from(organizationLocations)
    .where(
      and(
        eq(organizationLocations.organizationId, organizationId),
        eq(organizationLocations.locationEntityId, locationEntityId),
      ),
    )
    .get()

  if (!existing) {
    throw Object.assign(new Error('Organization not linked to this location'), { statusCode: 404 })
  }

  const normalizedDescription = description.trim() || null

  db.update(organizationLocations)
    .set({ description: normalizedDescription })
    .where(
      and(
        eq(organizationLocations.organizationId, organizationId),
        eq(organizationLocations.locationEntityId, locationEntityId),
      ),
    )
    .run()

  return { organizationId, locationEntityId, description: normalizedDescription }
}
