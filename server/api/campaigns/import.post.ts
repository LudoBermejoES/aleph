import { useDb } from '../../utils/db'
import { importCampaign } from '../../services/campaign-import'
import type { CampaignExport } from '../../services/campaign-export'
import { logger } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  let body: CampaignExport
  try {
    body = await readBody(event)
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid JSON body' })
  }

  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, message: 'Invalid JSON body' })
  }

  if (body.version !== '1.0') {
    throw createError({
      statusCode: 422,
      message: `Unsupported export version: "${body.version}". Only version "1.0" is supported.`,
    })
  }

  if (!body.campaign || typeof body.campaign !== 'object') {
    throw createError({ statusCode: 422, message: 'Missing campaign envelope in import payload' })
  }

  const query = getQuery(event)
  const nameOverride = query.name ? String(query.name) : undefined

  const db = useDb()

  try {
    const result = importCampaign(db, {
      payload: body,
      importingUserId: user.id,
      nameOverride,
    })

    logger.info('Campaign imported', {
      newCampaignId: result.id,
      name: result.name,
      userId: user.id,
    })

    setResponseStatus(event, 201)
    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed'
    logger.error('Campaign import failed', { userId: user.id, error: message })
    throw createError({ statusCode: 500, message })
  }
})
