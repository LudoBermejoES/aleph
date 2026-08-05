import { randomUUID } from 'crypto'
import { z } from 'zod'
import { useDb } from '../../utils/db'
import { campaigns } from '../../db/schema/campaigns'
import { campaignMembers } from '../../db/schema/campaign-members'
import { logger } from '../../utils/logger'
import { auditLogFromEvent } from '../../utils/audit'
import { seedEntityTypes } from '../../services/entity-types'
import { seedRelationTypes } from '../../services/relationships'
import { createDefaultSubCampaign } from '../../services/sub-campaigns'
import { validateBody } from '../../utils/validate'
import { mkdirSync } from 'fs'
import { join } from 'path'

const campaignSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  isPublic: z.boolean().optional(),
  theme: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const { name, description, isPublic, theme } = await validateBody(event, campaignSchema)

  const db = useDb()
  const id = randomUUID()
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const contentDir = join('content', 'campaigns', slug)
  const now = new Date()

  // Create content directory
  mkdirSync(join(process.cwd(), contentDir), { recursive: true })

  // Insert campaign
  db.insert(campaigns)
    .values({
      id,
      name: name.trim(),
      slug,
      description: description || null,
      isPublic: isPublic || false,
      theme: theme || null,
      contentDir,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  // Auto-assign DM role to creator
  db.insert(campaignMembers)
    .values({
      id: randomUUID(),
      campaignId: id,
      userId: user.id,
      role: 'dm',
      joinedAt: now,
    })
    .run()

  // Seed built-in entity types, relation types, and the mandatory default sub-campaign
  seedEntityTypes(db, id)
  seedRelationTypes(db, id)
  createDefaultSubCampaign(db, id)

  logger.info('Campaign created', { campaignId: id, name, userId: user.id })
  auditLogFromEvent(event, {
    action: 'campaign_create',
    userId: user.id,
    target: id,
    details: { name },
  })

  return { id, name, slug, contentDir }
})
