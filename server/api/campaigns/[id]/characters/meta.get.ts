import { eq, and, isNotNull } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { entities } from '../../../../db/schema/entities'
import { characters } from '../../../../db/schema/characters'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  // Auth is enforced by middleware (01.auth + 02.campaign); campaignRole is always set here
  if (!event.context.campaignRole) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const raceRows = db.select({ value: characters.race })
    .from(characters)
    .innerJoin(entities, eq(characters.entityId, entities.id))
    .where(and(eq(entities.campaignId, campaignId), isNotNull(characters.race)))
    .all()

  const classRows = db.select({ value: characters.class })
    .from(characters)
    .innerJoin(entities, eq(characters.entityId, entities.id))
    .where(and(eq(entities.campaignId, campaignId), isNotNull(characters.class)))
    .all()

  const alignmentRows = db.select({ value: characters.alignment })
    .from(characters)
    .innerJoin(entities, eq(characters.entityId, entities.id))
    .where(and(eq(entities.campaignId, campaignId), isNotNull(characters.alignment)))
    .all()

  return {
    races: [...new Set(raceRows.map(r => r.value as string))].sort(),
    classes: [...new Set(classRows.map(r => r.value as string))].sort(),
    alignments: [...new Set(alignmentRows.map(r => r.value as string))].sort(),
  }
})
