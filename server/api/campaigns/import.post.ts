import { useDb } from '../../utils/db'
import { importCampaign, importCampaignFromZip } from '../../services/campaign-import'
import type { CampaignExport } from '../../services/campaign-export'
import { logger } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  const contentType = getRequestHeader(event, 'content-type') ?? ''
  const query = getQuery(event)
  const nameOverride = query.name ? String(query.name) : undefined
  const db = useDb()

  // ── ZIP import (multipart/form-data) ──────────────────────────────────────
  if (contentType.includes('multipart/form-data')) {
    const formData = await readMultipartFormData(event)
    const filePart = formData?.find((p) => p.name === 'file')
    if (!filePart?.data) {
      throw createError({ statusCode: 400, message: 'Missing file field in multipart upload' })
    }

    try {
      const result = importCampaignFromZip(db, Buffer.from(filePart.data), user.id, nameOverride)
      logger.info('Campaign imported from ZIP', {
        newCampaignId: result.id,
        name: result.name,
        userId: user.id,
      })
      setResponseStatus(event, 201)
      return result
    } catch (err) {
      const e = err as Error & { statusCode?: number }
      const status = e.statusCode === 422 ? 422 : 500
      logger.error('Campaign ZIP import failed', { userId: user.id, error: e.message })
      throw createError({ statusCode: status, message: e.message })
    }
  }

  // ── JSON import (application/json) ────────────────────────────────────────
  let body: CampaignExport
  try {
    body = await readBody(event)
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid JSON body' })
  }

  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, message: 'Invalid JSON body' })
  }

  if (!['1.0', '1.1'].includes(body.version)) {
    throw createError({
      statusCode: 422,
      message: `Unsupported export version: "${body.version}". JSON import supports versions: "1.0", "1.1".`,
    })
  }

  if (!body.campaign || typeof body.campaign !== 'object') {
    throw createError({ statusCode: 422, message: 'Missing campaign envelope in import payload' })
  }

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
