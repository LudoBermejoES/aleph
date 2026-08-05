import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { entities } from '../../../../../../db/schema/entities'
import { entityNicknames } from '../../../../../../db/schema/entity-nicknames'
import { hasMinRole } from '../../../../../../utils/permissions'
import { invalidateAutomatonCache } from '../../../../../../services/autolink'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can remove nicknames' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const nicknameId = getRouterParam(event, 'nicknameId')!
  const db = useDb()

  const entity = db
    .select({ id: entities.id })
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Entity not found' })

  const nickname = db
    .select({ id: entityNicknames.id })
    .from(entityNicknames)
    .where(and(eq(entityNicknames.id, nicknameId), eq(entityNicknames.entityId, entity.id)))
    .get()
  if (!nickname) throw createError({ statusCode: 404, message: 'Nickname not found' })

  db.delete(entityNicknames).where(eq(entityNicknames.id, nickname.id)).run()

  invalidateAutomatonCache(campaignId)

  setResponseStatus(event, 204)
  return null
})
