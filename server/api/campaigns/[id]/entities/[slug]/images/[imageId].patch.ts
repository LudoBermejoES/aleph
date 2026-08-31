import { z } from 'zod'
import { useDb } from '../../../../../../utils/db'
import { withApiHandler } from '../../../../../../utils/api-handler'
import { validateBody } from '../../../../../../utils/validate'
import { hasMinRole } from '../../../../../../utils/permissions'
import { resolveReadableEntity } from '../../../../../../services/entities'
import {
  getImage,
  resolveEntityImageKind,
  updateImage,
} from '../../../../../../services/entity-images'
import type { CampaignRole } from '../../../../../../utils/permissions'

const patchSchema = z
  .object({
    caption: z.string().max(500).nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
    isPrimary: z.boolean().optional(),
  })
  .strict()

export default defineEventHandler(async (event) =>
  withApiHandler(event, async () => {
    const role = (event.context.campaignRole || 'visitor') as CampaignRole
    if (!hasMinRole(role, 'editor')) {
      throw createError({
        statusCode: 403,
        message: 'Editors or above can modify entity images',
      })
    }

    const campaignId = getRouterParam(event, 'id')!
    const slug = getRouterParam(event, 'slug')!
    const imageId = getRouterParam(event, 'imageId')!
    const userId = event.context.user?.id || ''
    const db = useDb()

    const entity = await resolveReadableEntity(db, { campaignId, slug, role, userId })
    if (!entity) throw createError({ statusCode: 404, message: 'Entity not found' })

    const body = await validateBody(event, patchSchema)

    if (body.isPrimary === false) {
      // A non-empty gallery always has exactly one primary. Un-setting it has no valid meaning —
      // promote a different image instead.
      throw createError({
        statusCode: 400,
        message: 'Cannot unset the main image. Set another image as primary instead.',
      })
    }

    if (!getImage(db, entity.id, imageId)) {
      throw createError({ statusCode: 404, message: 'Image not found' })
    }

    const updated = updateImage(db, entity.id, imageId, body, resolveEntityImageKind(db, entity))
    if (!updated) throw createError({ statusCode: 404, message: 'Image not found' })

    return updated
  }),
)
