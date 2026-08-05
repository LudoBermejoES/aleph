import { z } from 'zod'
import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { validateBody } from '../../../../../../utils/validate'
import { entities } from '../../../../../../db/schema/entities'
import { entityNicknames } from '../../../../../../db/schema/entity-nicknames'
import { hasMinRole } from '../../../../../../utils/permissions'
import { invalidateAutomatonCache } from '../../../../../../services/autolink'
import { normalizeNickname, isDuplicateNickname } from '../../../../../../services/entity-nicknames'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can add nicknames' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const nicknameSchema = z.object({ nickname: z.string() })
  const body = await validateBody(event, nicknameSchema)
  const nickname = normalizeNickname(body.nickname)

  if (!nickname) {
    throw createError({ statusCode: 422, message: 'Nickname must not be empty' })
  }

  const db = useDb()

  const entity = db
    .select({ id: entities.id })
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Entity not found' })

  const existing = db
    .select({ nickname: entityNicknames.nickname })
    .from(entityNicknames)
    .where(eq(entityNicknames.entityId, entity.id))
    .all()
  if (
    isDuplicateNickname(
      nickname,
      existing.map((r) => r.nickname),
    )
  ) {
    throw createError({
      statusCode: 409,
      message: `A nickname "${nickname}" already exists for this entity`,
    })
  }

  const id = randomUUID()
  const createdAt = new Date()
  db.insert(entityNicknames).values({ id, entityId: entity.id, nickname, createdAt }).run()

  invalidateAutomatonCache(campaignId)

  setResponseStatus(event, 201)
  return { id, entityId: entity.id, nickname, createdAt }
})
