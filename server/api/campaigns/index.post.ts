import { randomUUID } from 'crypto'
import { useDb } from '../../utils/db'
import { campaigns } from '../../db/schema/campaigns'
import { campaignMembers } from '../../db/schema/campaign-members'
import { logger } from '../../utils/logger'
import { auditLogFromEvent } from '../../utils/audit'
import { mkdirSync } from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const body = await readBody(event)
  const { name, description, isPublic } = body

  if (!name?.trim()) {
    throw createError({ statusCode: 400, message: 'Campaign name is required' })
  }

  const db = useDb()
  const id = randomUUID()
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const contentDir = join('content', 'campaigns', slug)
  const now = new Date()

  // Create content directory
  mkdirSync(join(process.cwd(), contentDir), { recursive: true })

  // Insert campaign
  db.insert(campaigns).values({
    id,
    name: name.trim(),
    slug,
    description: description || null,
    isPublic: isPublic || false,
    contentDir,
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
  }).run()

  // Auto-assign DM role to creator
  db.insert(campaignMembers).values({
    id: randomUUID(),
    campaignId: id,
    userId: user.id,
    role: 'dm',
    joinedAt: now,
  }).run()

  logger.info('Campaign created', { campaignId: id, name, userId: user.id })
  auditLogFromEvent(event, {
    action: 'campaign_create',
    userId: user.id,
    target: id,
    details: { name },
  })

  return { id, name, slug, contentDir }
})
